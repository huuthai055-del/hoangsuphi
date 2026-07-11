import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/database/client';
import { userSessions } from '@/lib/database/schema/users';
import type { IUserSessionRepository, UserSessionModel } from '../service/session.service';

export class DrizzleSessionRepository implements IUserSessionRepository {
  public async create(session: UserSessionModel): Promise<void> {
    await db.insert(userSessions).values({
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

  public async findById(id: string): Promise<UserSessionModel | null> {
    const rows = await db.select().from(userSessions).where(eq(userSessions.id, id)).limit(1);

    if (rows.length === 0) return null;
    const raw = rows[0];

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

  public async update(session: UserSessionModel): Promise<void> {
    await db
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

  public async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    await db
      .update(userSessions)
      .set({
        isRevoked: true,
        revokedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isRevoked, false)));
  }
}
