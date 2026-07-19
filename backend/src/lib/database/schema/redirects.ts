import { generateUuidV7 } from '@/common/utils/uuid';
import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const redirects = pgTable(
  'redirects',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    sourcePath: text('source_path').notNull(),
    targetPath: text('target_path').notNull(),
    statusCode: integer('status_code').notNull().default(301),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    statusCodeCheck: check('status_code_check', sql`${table.statusCode} IN (301, 302)`),
    sourceTargetCheck: check('source_target_check', sql`${table.sourcePath} <> ${table.targetPath}`),
    // Partial unique index to guarantee uniqueness of active sources
    activeSourceUniqueIdx: uniqueIndex('redirects_active_source_idx')
      .on(table.sourcePath)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
  }),
);
