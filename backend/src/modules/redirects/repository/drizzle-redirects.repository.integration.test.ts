import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../../lib/database/client';
import * as schema from '../../../lib/database/schema';
import { redirects, users } from '../../../lib/database/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Redirect } from '../domain/redirect.entity';
import { RedirectChainError, RedirectDuplicateError } from '../domain/redirect.errors';
import { DrizzleRedirectsRepository } from './drizzle-redirects.repository';

type ErrorConstructor = new (...args: never[]) => Error;

async function expectRejectedWith(
  operation: Promise<unknown>,
  expectedError: ErrorConstructor
): Promise<void> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(expectedError);
    return;
  }
  throw new Error(`Expected operation to reject with ${expectedError.name}`);
}

const testDatabaseUrl =
  process.env.REDIRECTS_TEST_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  process.env.IDENTITY_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('DrizzleRedirectsRepository PostgreSQL integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;
  let repository: DrizzleRedirectsRepository;
  const adminId = randomUUID();
  const prefix = `/redirect-test-${randomUUID()}`.toLowerCase();

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      return;
    }
    sqlClient = postgres(testDatabaseUrl, { max: 4, prepare: false });
    const databaseRows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    if (!databaseRows[0]?.databaseName.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Redirect integration tests require a dedicated database ending in _test');
    }
    const tableRows = await sqlClient<{ tableName: string | null }[]>`
      SELECT to_regclass('public.redirects') AS "tableName"
    `;
    if (tableRows[0]?.tableName !== 'redirects') {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Redirect integration tests require migration 0018 to be applied first');
    }

    dbClient = drizzle(sqlClient, { schema }) as Database;
    repository = new DrizzleRedirectsRepository(dbClient);
    await dbClient.insert(users).values({
      id: adminId,
      email: `redirect-admin-${adminId}@hoangsuphi.vn`,
      passwordHash: 'test-password-hash',
      status: 'active',
    });
  });

  beforeEach(async () => {
    await dbClient.delete(redirects).where(eq(redirects.createdBy, adminId));
  });

  afterAll(async () => {
    if (!sqlClient) {
      return;
    }
    await dbClient.delete(redirects).where(eq(redirects.createdBy, adminId));
    await dbClient.delete(users).where(eq(users.id, adminId));
    await sqlClient.end({ timeout: 5 });
  });

  function makeRedirect(
    sourceSuffix: string,
    targetSuffix: string,
    isActive = true,
    now?: Date
  ): Redirect {
    return Redirect.create({
      id: randomUUID(),
      sourcePath: `${prefix}/${sourceSuffix}`,
      targetPath: `${prefix}/${targetSuffix}`,
      statusCode: 301,
      isActive,
      createdBy: adminId,
      now,
    });
  }

  test('persists and resolves an active redirect, but not an inactive or deleted rule', async () => {
    const active = makeRedirect('old', 'new');
    const inactive = makeRedirect('inactive-source', 'inactive-target', false);
    await repository.create(active);
    await repository.create(inactive);

    expect((await repository.findBySource(active.sourcePath))?.id).toBe(active.id);
    expect(await repository.findBySource(inactive.sourcePath)).toBeNull();

    active.softDelete();
    await repository.softDelete(active);
    expect(await repository.findById(active.id)).toBeNull();
    expect(await repository.findBySource(active.sourcePath)).toBeNull();
  });

  test('enforces duplicate sources and both directions of a redirect chain', async () => {
    const first = makeRedirect('source', 'target');
    await repository.create(first);

    await expectRejectedWith(
      repository.create(makeRedirect('source', 'other-target')),
      RedirectDuplicateError
    );
    await expectRejectedWith(repository.create(makeRedirect('next-source', 'source')), RedirectChainError);
    await expectRejectedWith(repository.create(makeRedirect('target', 'next-target')), RedirectChainError);
  });

  test('serializes concurrent writes so only one conflicting chain endpoint succeeds', async () => {
    const first = makeRedirect('concurrent-a', 'concurrent-b');
    const second = makeRedirect('concurrent-b', 'concurrent-c');
    const results = await Promise.allSettled([repository.create(first), repository.create(second)]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(RedirectChainError);
    }
  });

  test('uses the last item actually returned as its keyset cursor without skipping records', async () => {
    const paginationTime = new Date('2099-01-01T00:00:00.000Z');
    const created = [
      makeRedirect('page-source-a', 'page-target-a', true, paginationTime),
      makeRedirect('page-source-b', 'page-target-b', true, paginationTime),
      makeRedirect('page-source-c', 'page-target-c', true, paginationTime),
    ];
    for (const redirect of created) {
      await repository.create(redirect);
    }

    const firstPage = await repository.list({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();
    const cursor = firstPage.nextCursor;
    if (!cursor) {
      throw new Error('Expected a cursor for the first redirect page');
    }
    const secondPage = await repository.list({ limit: 2, cursor });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
    expect(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id))).toEqual(
      new Set(created.map((item) => item.id))
    );
  });

  test('applies database-level status and self-redirect checks', async () => {
    const constraints = await sqlClient<{ constraintName: string }[]>`
      SELECT conname AS "constraintName"
      FROM pg_constraint
      WHERE conrelid = 'public.redirects'::regclass
        AND conname IN ('status_code_check', 'source_target_check')
      ORDER BY conname
    `;
    expect(constraints.map((constraint) => constraint.constraintName)).toEqual([
      'source_target_check',
      'status_code_check',
    ]);

    const sourcePath = `${prefix}/db-source`;
    await expect(
      dbClient.insert(redirects).values({
        id: randomUUID(),
        sourcePath,
        targetPath: sourcePath,
        statusCode: 301,
        isActive: true,
        createdBy: adminId,
      }).execute()
    ).rejects.toMatchObject({ code: '23514' });
  });
});
