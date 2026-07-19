import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { User } from '../domain/user.entity';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { oneTimeTokens } from '@/lib/database/schema/users';
import { FakeRedisStore } from '@/lib/redis/fake-redis-store';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DrizzleOneTimeTokenRepository } from '../repository/drizzle-one-time-token.repository';
import { EmailVerificationService } from './email-verification.service';

const testDatabaseUrl =
  process.env.IDENTITY_TEST_DATABASE_URL || process.env.TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;
const syntheticUserId = '00000000-0000-0000-0000-000000000000';

function createUserRepository(user: User | null): IUserRepository {
  return {
    findById: async () => null,
    findByEmail: async () => user,
    existsByEmail: async () => false,
    create: async () => {},
    update: async () => {},
    delete: async () => {},
    assignRole: async () => {},
    removeRole: async () => {},
    findRoleByCode: async () => null,
  };
}

integrationDescribe('EmailVerificationService PostgreSQL resend integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    sqlClient = postgres(testDatabaseUrl, { max: 1, prepare: false });
    const rows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    if (!rows[0]?.databaseName.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Email verification integration tests require a database ending in _test');
    }
    dbClient = drizzle(sqlClient, { schema }) as Database;
  });

  afterAll(async () => {
    if (sqlClient) {
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('returns generic success for a nonexistent email without inserting a synthetic token', async () => {
    let sendCalls = 0;
    const sender: IEmailSender = {
      send: async () => {
        sendCalls += 1;
        return { messageId: 'fake-message', provider: 'fake' };
      },
    };
    const service = new EmailVerificationService(
      createUserRepository(null),
      new DrizzleOneTimeTokenRepository(dbClient),
      sender,
      new FakeRedisStore(),
      25
    );

    await expect(service.resend('missing-user@hoangsuphi.vn', '127.0.0.1')).resolves.toBeUndefined();

    const syntheticTokens = await dbClient
      .select({ id: oneTimeTokens.id })
      .from(oneTimeTokens)
      .where(
        and(
          eq(oneTimeTokens.userId, syntheticUserId),
          eq(oneTimeTokens.type, 'email_verification')
        )
      );
    expect(syntheticTokens).toHaveLength(0);
    expect(sendCalls).toBe(0);
  });
});
