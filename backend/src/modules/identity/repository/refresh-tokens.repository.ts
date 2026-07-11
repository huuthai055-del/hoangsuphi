import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/database/client';
import { refreshTokens } from '@/lib/database/schema/users';
import type { IRefreshTokenRepository, RefreshTokenModel } from '../service/session.service';

export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  public async create(token: RefreshTokenModel): Promise<void> {
    await db.insert(refreshTokens).values({
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

  public async findById(id: string): Promise<RefreshTokenModel | null> {
    const rows = await db.select().from(refreshTokens).where(eq(refreshTokens.id, id)).limit(1);

    if (rows.length === 0) return null;
    const raw = rows[0];

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
   */
  public async findByHash(hash: string): Promise<RefreshTokenModel | null> {
    const rows = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .for('update') // Enforce ROW LOCK FOR UPDATE
      .limit(1);

    if (rows.length === 0) return null;
    const raw = rows[0];

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

  public async update(token: RefreshTokenModel): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isUsed: token.isUsed,
        isRevoked: token.isRevoked,
        updatedAt: token.updatedAt,
      })
      .where(eq(refreshTokens.id, token.id));
  }

  public async revokeFamily(familyId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.familyId, familyId), eq(refreshTokens.isRevoked, false)));
  }

  public async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)));
  }

  public async revokeAllSessionTokens(sessionId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(and(eq(refreshTokens.sessionId, sessionId), eq(refreshTokens.isRevoked, false)));
  }
}
