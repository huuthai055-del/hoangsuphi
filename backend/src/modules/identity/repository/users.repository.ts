import { db, type TransactionClient } from '@/lib/database/client';
import { users } from '@/lib/database/schema/users';
import { userRoles } from '@/lib/database/schema/references';
import { eq, and, isNull } from 'drizzle-orm';
import type { User } from '../domain/user.entity';
import type { IUserRepository } from './users-repository.interface';
import { UserMapper } from './users.mapper';

export class DrizzleUserRepository implements IUserRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  public async findById(id: string, tx?: unknown): Promise<User | null> {
    const [raw] = await this.getClient(tx).select().from(users).where(eq(users.id, id)).limit(1);
    return raw ? UserMapper.toDomain(raw) : null;
  }

  public async findByEmail(email: string, tx?: unknown): Promise<User | null> {
    const [raw] = await this.getClient(tx)
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return raw ? UserMapper.toDomain(raw) : null;
  }

  public async existsByEmail(email: string, tx?: unknown): Promise<boolean> {
    const [raw] = await this.getClient(tx)
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return !!raw;
  }

  public async create(user: User, tx?: unknown): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await this.getClient(tx).insert(users).values(data);
  }

  public async update(user: User, tx?: unknown): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await this.getClient(tx)
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

  public async delete(id: string, tx?: unknown): Promise<void> {
    await this.getClient(tx).delete(users).where(eq(users.id, id));
  }

  public async assignRole(userId: string, roleId: string, tx?: unknown): Promise<void> {
    await this.getClient(tx).insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
  }

  public async removeRole(userId: string, roleId: string, tx?: unknown): Promise<void> {
    await this.getClient(tx)
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }
}
