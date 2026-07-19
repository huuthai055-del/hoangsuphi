import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { oneTimeTokens, users } from '@/lib/database/schema/users';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DrizzleOneTimeTokenRepository } from './drizzle-one-time-token.repository';

const testDatabaseUrl =
  process.env.IDENTITY_TEST_DATABASE_URL || process.env.TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('DrizzleOneTimeTokenRepository PostgreSQL Integration Tests', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;
  let repository: DrizzleOneTimeTokenRepository;
  const testUserId = randomUUID();

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });

    // Ensure it's a test database
    const databaseRows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    const databaseName = databaseRows[0]?.databaseName;
    if (!databaseName?.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Identity integration tests require a dedicated database ending in _test');
    }

    dbClient = drizzle(sqlClient, { schema }) as Database;
    repository = new DrizzleOneTimeTokenRepository(dbClient);

    // Insert test user to satisfy foreign key constraint
    await dbClient.insert(users).values({
      id: testUserId,
      email: `test-token-repo-${testUserId}@hoangsuphi.vn`,
      passwordHash: 'dummy_hash_for_test',
    });
  });

  afterAll(async () => {
    if (!sqlClient || !dbClient) return;
    // Cleanup test user and tokens (tokens cascade delete with user)
    await dbClient.delete(users).where(eq(users.id, testUserId));
    await sqlClient.end({ timeout: 5 });
  });

  test('should generate raw token and store only SHA-256 hash with correct expiry', async () => {
    const rawToken = await repository.createToken(testUserId, 'email_verification', 3600);
    expect(rawToken.length).toBe(43);

    const expectedHash = createHash('sha256').update(rawToken).digest('hex');
    const storedRows = await dbClient
      .select()
      .from(oneTimeTokens)
      .where(eq(oneTimeTokens.tokenHash, expectedHash));

    expect(storedRows.length).toBe(1);
    const row = storedRows[0];
    if (!row) throw new Error('Stored row not found');
    expect(row.userId).toBe(testUserId);
    expect(row.tokenHash).toBe(expectedHash);
    expect(row.tokenHash).not.toBe(rawToken);
    expect(row.type).toBe('email_verification');
    expect(row.isUsed).toBe(false);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 3500 * 1000);
  });

  test('should safely and race-safely consume token only once when called concurrently', async () => {
    const rawToken = await repository.createToken(testUserId, 'password_reset', 3600);

    // Simulate 5 concurrent consume requests trying to use the exact same token simultaneously
    const consumePromises = [
      repository.consumeToken(rawToken, 'password_reset'),
      repository.consumeToken(rawToken, 'password_reset'),
      repository.consumeToken(rawToken, 'password_reset'),
      repository.consumeToken(rawToken, 'password_reset'),
      repository.consumeToken(rawToken, 'password_reset'),
    ];

    const results = await Promise.all(consumePromises);
    const successfulConsumes = results.filter((res) => res === testUserId);
    const failedConsumes = results.filter((res) => res === null);

    expect(successfulConsumes.length).toBe(1);
    expect(failedConsumes.length).toBe(4);

    // Verify DB state
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const rows = await dbClient.select().from(oneTimeTokens).where(eq(oneTimeTokens.tokenHash, hash));
    expect(rows[0]?.isUsed).toBe(true);
  });

  test('should work within database transaction and rollback on failure', async () => {
    let rawTokenCreated = '';

    try {
      await dbClient.transaction(async (tx) => {
        rawTokenCreated = await repository.createToken(testUserId, 'magic_link', 600, tx as any);
        const consumed = await repository.consumeToken(rawTokenCreated, 'magic_link', tx as any);
        expect(consumed).toBe(testUserId);
        throw new Error('Simulated transaction abort');
      });
    } catch (err: any) {
      expect(err.message).toBe('Simulated transaction abort');
    }

    // Verify token changes were rolled back completely
    const hash = createHash('sha256').update(rawTokenCreated).digest('hex');
    const rows = await dbClient.select().from(oneTimeTokens).where(eq(oneTimeTokens.tokenHash, hash));
    expect(rows.length).toBe(0);
  });

  test('should revoke pending tokens for specific user and type', async () => {
    await repository.createToken(testUserId, 'email_change', 3600);
    await repository.createToken(testUserId, 'email_change', 3600);

    await repository.revokePendingTokens(testUserId, 'email_change');

    const rows = await dbClient
      .select()
      .from(oneTimeTokens)
      .where(eq(oneTimeTokens.userId, testUserId));

    const emailChangeRows = rows.filter((r) => r.type === 'email_change');
    expect(emailChangeRows.length).toBeGreaterThanOrEqual(2);
    expect(emailChangeRows.every((r) => r.isUsed === true)).toBe(true);
  });

  test('should not consume expired tokens', async () => {
    // Create token expired 10 seconds ago (-10 seconds TTL)
    const rawToken = await repository.createToken(testUserId, 'email_verification', -10);

    const result = await repository.consumeToken(rawToken, 'email_verification');
    expect(result).toBeNull();

    const hash = createHash('sha256').update(rawToken).digest('hex');
    const rows = await dbClient.select().from(oneTimeTokens).where(eq(oneTimeTokens.tokenHash, hash));
    expect(rows[0]?.isUsed).toBe(false);
  });
});
