import { pgTable, uuid, varchar, integer, timestamp, text, pgEnum, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { generateUuidV7 } from '@/common/utils/uuid';

// 1. Enums
export const ownerTypeEnum = pgEnum('owner_type', ['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION']);
export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'APPROVED', 'REJECTED']);

// 2. Reviews Table
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ownerType: ownerTypeEnum('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    status: reviewStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    // Rating check constraint: must be between 1 and 5
    ratingCheck: check('reviews_rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    
    // Partial unique index: A user can only review a specific active entity once.
    // If soft-deleted, they can write another review.
    userOwnerUniqueIdx: uniqueIndex('reviews_user_owner_uniq_idx')
      .on(table.userId, table.ownerType, table.ownerId)
      .where(sql`deleted_at IS NULL`),
      
    // General lookup indexes
    userIdIdx: index('reviews_user_id_idx').on(table.userId),
    ownerIdx: index('reviews_owner_idx').on(table.ownerType, table.ownerId),
    statusIdx: index('reviews_status_idx').on(table.status),
    createdAtIdx: index('reviews_created_at_idx').on(table.createdAt),
  })
);

// 3. Favorites Table
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ownerType: ownerTypeEnum('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique index: A user can only favorite an entity once. No soft delete on favorites.
    userOwnerUniqueIdx: uniqueIndex('favorites_user_owner_uniq_idx').on(
      table.userId,
      table.ownerType,
      table.ownerId
    ),
    
    // General lookup indexes
    userIdIdx: index('favorites_user_id_idx').on(table.userId),
    ownerIdx: index('favorites_owner_idx').on(table.ownerType, table.ownerId),
    createdAtIdx: index('favorites_created_at_idx').on(table.createdAt),
  })
);
