import type { users } from '@/lib/database/schema/users';
import type { InferSelectModel } from 'drizzle-orm';
import { User } from '../domain/user.entity';

export type UserDbModel = InferSelectModel<typeof users>;

export const UserMapper = {
  toDomain(raw: UserDbModel): User {
    return User.rehydrate({
      id: raw.id,
      email: raw.email,
      passwordHash: raw.passwordHash,
      status: raw.status,
      failedLoginAttempts: raw.failedLoginAttempts,
      lockoutUntil: raw.lockoutUntil,
      permissionsVersion: raw.permissionsVersion,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      lastLoginAt: raw.lastLoginAt,
      lastPasswordChangedAt: raw.lastPasswordChangedAt,
      lastFailedLoginAt: raw.lastFailedLoginAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(domain: User): UserDbModel {
    return {
      id: domain.id,
      email: domain.email,
      passwordHash: domain.passwordHash,
      status: domain.status,
      failedLoginAttempts: domain.failedLoginAttempts,
      lockoutUntil: domain.lockoutUntil,
      permissionsVersion: domain.permissionsVersion,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      lastLoginAt: domain.lastLoginAt,
      lastPasswordChangedAt: domain.lastPasswordChangedAt,
      lastFailedLoginAt: domain.lastFailedLoginAt,
      deletedAt: domain.deletedAt,
    };
  },
};
