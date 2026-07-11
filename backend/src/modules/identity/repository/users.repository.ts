import { db } from '@/lib/database/client';
import { users } from '@/lib/database/schema/users';
import { userRoles } from '@/lib/database/schema/references';
import { eq, and, isNull } from 'drizzle-orm';
import type { User } from '../domain/user.entity';
import type { IUserRepository } from './users-repository.interface';
import { UserMapper } from './users.mapper';

export class DrizzleUserRepository implements IUserRepository {
  public async findById(id: string): Promise<User | null> {
    const [raw] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return raw ? UserMapper.toDomain(raw) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const [raw] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return raw ? UserMapper.toDomain(raw) : null;
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const [raw] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return !!raw;
  }

  public async create(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await db.insert(users).values(data);
  }

  public async update(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await db
      .update(users)
      .set({
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status,
        failedLoginAttempts: data.failedLoginAttempts,
        lockoutUntil: data.lockoutUntil,
        permissionsVersion: data.permissionsVersion,
        updatedAt: data.updatedAt,
        lastLoginAt: data.lastLoginAt,
        lastPasswordChangedAt: data.lastPasswordChangedAt,
        lastFailedLoginAt: data.lastFailedLoginAt,
        deletedAt: data.deletedAt,
      })
      .where(eq(users.id, data.id));
  }

  public async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  public async assignRole(userId: string, roleId: string): Promise<void> {
    await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
  }

  public async removeRole(userId: string, roleId: string): Promise<void> {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }
}
