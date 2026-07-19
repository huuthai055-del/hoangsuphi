import { randomBytes, createHash } from 'node:crypto';
import { and, eq, sql, gt } from 'drizzle-orm';
import type { IOneTimeTokenRepository } from './one-time-token.repository.interface';
import { db } from '@/lib/database/client';
import type { TransactionClient } from '@/lib/database/client';
import { oneTimeTokens } from '@/lib/database/schema/users';

export class DrizzleOneTimeTokenRepository implements IOneTimeTokenRepository {
  constructor(private readonly database: TransactionClient | typeof db = db) {}

  private generateRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async createToken(
    userId: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    ttlSeconds: number,
    tx?: TransactionClient
  ): Promise<string> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const database = tx ?? this.database;

    await database.insert(oneTimeTokens).values({
      userId,
      tokenHash,
      type,
      expiresAt,
    });

    return rawToken;
  }

  async revokePendingTokens(
    userId: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    tx?: TransactionClient
  ): Promise<void> {
    const database = tx ?? this.database;
    await database
      .update(oneTimeTokens)
      .set({ isUsed: true })
      .where(
        and(
          eq(oneTimeTokens.userId, userId),
          eq(oneTimeTokens.type, type),
          eq(oneTimeTokens.isUsed, false)
        )
      );
  }

  async consumeToken(
    rawToken: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    tx?: TransactionClient
  ): Promise<string | null> {
    const tokenHash = this.hashToken(rawToken);
    const database = tx ?? this.database;

    const results = await database
      .update(oneTimeTokens)
      .set({ isUsed: true, updatedAt: sql`NOW()` })
      .where(
        and(
          eq(oneTimeTokens.tokenHash, tokenHash),
          eq(oneTimeTokens.type, type),
          eq(oneTimeTokens.isUsed, false),
          gt(oneTimeTokens.expiresAt, new Date()) // Must not be expired
        )
      )
      .returning({ userId: oneTimeTokens.userId });

    return results[0]?.userId ?? null;
  }
}
