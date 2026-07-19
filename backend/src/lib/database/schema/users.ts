import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer']);
export const statusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'locked',
  'suspended',
  'pending_verification',
  'deleted',
]);
export const oneTimeTokenTypeEnum = pgEnum('one_time_token_type', [
  'email_verification',
  'password_reset',
  'email_change',
  'magic_link',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    status: statusEnum('status').notNull().default('pending_verification'),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockoutUntil: timestamp('lockout_until', { withTimezone: true }),
    permissionsVersion: integer('permissions_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastPasswordChangedAt: timestamp('last_password_changed_at', { withTimezone: true }),
    lastFailedLoginAt: timestamp('last_failed_login_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    statusDeletedIdx: index('users_status_deleted_idx').on(table.status, table.deletedAt),
    emailUniqueIdx: uniqueIndex('users_email_unique_idx')
      .on(table.email)
      .where(sql`deleted_at IS NULL`),
    failedAttemptsCheck: check('users_failed_attempts_check', sql`failed_login_attempts >= 0`),
    permissionsVersionCheck: check(
      'users_permissions_version_check',
      sql`permissions_version >= 1`
    ),
  })
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    phoneNumber: varchar('phone_number', { length: 20 }).unique(),
    bio: varchar('bio', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_profiles_user_id_idx').on(table.userId),
  })
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceName: varchar('device_name', { length: 100 }),
    ipAddress: inet('ip_address').notNull(),
    userAgent: varchar('user_agent', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    isRevoked: boolean('is_revoked').notNull().default(false),
    revokedReason: varchar('revoked_reason', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdRevokedIdx: index('user_sessions_user_id_revoked_idx').on(table.userId, table.isRevoked),
  })
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => userSessions.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    parentId: uuid('parent_id'),
    familyId: uuid('family_id').notNull(),
    version: integer('version').notNull().default(1),
    isUsed: boolean('is_used').notNull().default(false),
    isRevoked: boolean('is_revoked').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
    sessionIdIdx: index('refresh_tokens_session_id_idx').on(table.sessionId),
    familyIdIdx: index('refresh_tokens_family_id_idx').on(table.familyId),
    userIdRevokedIdx: index('refresh_tokens_user_id_revoked_idx').on(table.userId, table.isRevoked),
    sessionIdRevokedIdx: index('refresh_tokens_session_id_revoked_idx').on(
      table.sessionId,
      table.isRevoked
    ),
  })
);

export const oneTimeTokens = pgTable(
  'one_time_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    type: oneTimeTokenTypeEnum('type').notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashTypeIdx: index('one_time_tokens_token_hash_type_idx').on(table.tokenHash, table.type),
  })
);
