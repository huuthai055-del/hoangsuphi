import { type TransactionClient, db } from '@/lib/database/client';
import { userSessions } from '@/lib/database/schema/users';
import { and, eq } from 'drizzle-orm';
import type { IUserSessionRepository, UserSessionModel } from '../service/session.service';

export class DrizzleSessionRepository implements IUserSessionRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  public async create(session: UserSessionModel, tx?: unknown): Promise<void> {
    await this.getClient(tx).insert(userSessions).values({
      id: session.id,
      userId: session.userId,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      isRevoked: session.isRevoked,
      revokedReason: session.revokedReason,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  public async findById(id: string, tx?: unknown): Promise<UserSessionModel | null> {
    const [raw] = await this.getClient(tx)
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, id))
      .limit(1);

    if (!raw) return null;

    return {
      id: raw.id,
      userId: raw.userId,
      deviceName: raw.deviceName,
      ipAddress: raw.ipAddress,
      userAgent: raw.userAgent,
      expiresAt: raw.expiresAt,
      lastActivityAt: raw.lastActivityAt,
      isRevoked: raw.isRevoked,
      revokedReason: raw.revokedReason,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  public async update(session: UserSessionModel, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(userSessions)
      .set({
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        isRevoked: session.isRevoked,
        revokedReason: session.revokedReason,
        updatedAt: session.updatedAt,
      })
      .where(eq(userSessions.id, session.id));
  }

  public async revokeAllUserSessions(userId: string, reason: string, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .update(userSessions)
      .set({
        isRevoked: true,
        revokedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isRevoked, false)));
  }
}
