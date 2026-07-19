import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from '../../../lib/database/client';
import * as schema from '../../../lib/database/schema';
import { redirects, users } from '../../../lib/database/schema';
import { RedisStoreAdapter } from '../../../lib/redis/redis-store.adapter';
import { DrizzleRedirectsRepository } from '../repository/drizzle-redirects.repository';
import { RedirectsService } from './redirects.service';

const testDatabaseUrl =
  process.env.REDIRECTS_TEST_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  process.env.IDENTITY_TEST_DATABASE_URL;
const redisTestUrl = process.env.REDIS_TEST_URL ?? 'redis://localhost:6379';
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('RedirectsService PostgreSQL + Redis integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;
  let redis: RedisStoreAdapter;
  let service: RedirectsService;
  const adminId = randomUUID();
  const prefix = `/redirect-cache-${randomUUID()}`.toLowerCase();
  const cacheKey = (sourcePath: string) => `redirect:resolution:${sourcePath}`;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      return;
    }

    sqlClient = postgres(testDatabaseUrl, { max: 4, prepare: false });
    const [database] = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    if (!database?.databaseName.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Redirect integration tests require a dedicated database ending in _test');
    }

    const [redirectTable] = await sqlClient<{ tableName: string | null }[]>`
      SELECT to_regclass('public.redirects') AS "tableName"
    `;
    if (redirectTable?.tableName !== 'redirects') {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Redirect integration tests require migration 0018 to be applied first');
    }

    dbClient = drizzle(sqlClient, { schema }) as Database;
    await dbClient.insert(users).values({
      id: adminId,
      email: `redirect-cache-admin-${adminId}@hoangsuphi.vn`,
      passwordHash: 'test-password-hash',
      status: 'active',
    });

    redis = new RedisStoreAdapter(redisTestUrl);
    await redis.waitUntilReady();
    service = new RedirectsService(new DrizzleRedirectsRepository(dbClient), redis);
  });

  beforeEach(async () => {
    await dbClient.delete(redirects).where(eq(redirects.createdBy, adminId));
    for (const suffix of ['/old', '/moved', '/deleted']) {
      await redis.delete(cacheKey(`${prefix}${suffix}`));
    }
  });

  afterAll(async () => {
    if (!sqlClient) {
      return;
    }
    try {
      await dbClient.delete(redirects).where(eq(redirects.createdBy, adminId));
      for (const suffix of ['/old', '/moved', '/deleted']) {
        await redis.delete(cacheKey(`${prefix}${suffix}`));
      }
      await dbClient.delete(users).where(eq(users.id, adminId));
    } finally {
      redis.disconnect();
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('persists, invalidates, and repopulates the live Redis resolution cache after CRUD', async () => {
    const created = await service.createRedirect(
      {
        sourcePath: `${prefix}/old`,
        targetPath: `${prefix}/new`,
        statusCode: 301,
      },
      adminId
    );

    expect(await redis.get(cacheKey(created.sourcePath))).toBe(
      JSON.stringify({ targetPath: `${prefix}/new`, statusCode: 301 })
    );
    expect(await redis.ttl(cacheKey(created.sourcePath))).toBeGreaterThan(0);
    expect(await service.resolveRedirect(`${created.sourcePath}?utm_source=integration`)).toEqual({
      targetPath: `${prefix}/new`,
      statusCode: 301,
    });

    const updated = await service.updateRedirect(
      created.id,
      {
        sourcePath: `${prefix}/moved`,
        targetPath: `${prefix}/after-update`,
        statusCode: 302,
      },
      adminId
    );

    expect(await redis.get(cacheKey(created.sourcePath))).toBeNull();
    expect(await redis.get(cacheKey(updated.sourcePath))).toBe(
      JSON.stringify({ targetPath: `${prefix}/after-update`, statusCode: 302 })
    );
    expect(await service.resolveRedirect(created.sourcePath)).toBeNull();
    expect(await service.resolveRedirect(updated.sourcePath)).toEqual({
      targetPath: `${prefix}/after-update`,
      statusCode: 302,
    });

    await service.deleteRedirect(updated.id, adminId);
    expect(await redis.get(cacheKey(updated.sourcePath))).toBeNull();
    expect(await service.resolveRedirect(updated.sourcePath)).toBeNull();
  });
});
