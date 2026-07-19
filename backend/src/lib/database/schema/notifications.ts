import { generateUuidV7 } from '@/common/utils/uuid';
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationTypeEnum = pgEnum('notification_type', [
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull().default('INFO'),
    isRead: boolean('is_read').notNull().default(false),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    deletedAtIdx: index('notifications_deleted_at_idx').on(table.deletedAt),
  })
);
