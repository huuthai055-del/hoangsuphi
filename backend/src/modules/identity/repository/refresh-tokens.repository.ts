import { type TransactionClient, db } from '@/lib/database/client';
import { refreshTokens } from '@/lib/database/schema/users';
import { and, eq } from 'drizzle-orm';
import type { IRefreshTokenRepository, RefreshTokenModel } from '../service/session.service';

export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  public async create(token: RefreshTokenModel, tx?: unknown): Promise<void> {
    await this.getClient(tx).insert(refreshTokens).values({
      id: token.id,
      userId: token.userId,
      sessionId: token.sessionId,
      tokenHash: token.tokenHash,
      parentId: token.parentId,
      familyId: token.familyId,
      version: token.version,
      isUsed: token.isUsed,
      isRevoked: token.isRevoked,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    });
  }

  public async findById(id: string, tx?: unknown): Promise<RefreshTokenModel | null> {
    const [raw] = await this.getClient(tx)
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);

    if (!raw) return null;

    return {
      id: raw.id,
      userId: raw.userId,
      sessionId: raw.sessionId,
      tokenHash: raw.tokenHash,
      parentId: raw.parentId,
      familyId: raw.familyId,
      version: raw.version,
      isUsed: raw.isUsed,
      isRevoked: raw.isRevoked,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  /**
   * CRITICAL SECURITY REQUIREMENT: MUST use row locking (SELECT ... FOR UPDATE)
   * to prevent race conditions during concurrent token refresh requests.
   * The lock is applied to the transaction connection when `tx` is provided,
   * ensuring the entire rotation operation is serialized.
   */
  public async findByHash(hash: string, tx?: unknown): Promise<RefreshTokenModel | null> {
    const [raw] = await this.getClient(tx)
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .for('update') // Enforce ROW LOCK FOR UPDATE — must run inside a transaction
      .limit(1);

    if (!raw) return null;

    return {
      id: raw.id,
      userId: raw.userId,
      sessionId: raw.sessionId,
      tokenHash: raw.tokenHash,
      parentId: raw.parentId,
      familyId: raw.familyId,
      version: raw.version,
      isUsed: raw.isUsed,
      isRevoked: raw.isRevoked,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  public async update(token: RefreshTokenModel, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(refreshTokens)
      .set({
        isUsed: token.isUsed,
        isRevoked: token.isRevoked,
        updatedAt: token.updatedAt,
      })
      .where(eq(refreshTokens.id, token.id));
  }

  public async revokeFamily(familyId: string, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.familyId, familyId), eq(refreshTokens.isRevoked, false)));
  }

  public async revokeAllUserTokens(userId: string, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)));
  }

  public async revokeAllSessionTokens(sessionId: string, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.sessionId, sessionId), eq(refreshTokens.isRevoked, false)));
  }
}
