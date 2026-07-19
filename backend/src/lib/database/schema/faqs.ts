import { generateUuidV7 } from '@/common/utils/uuid';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const faqStatusEnum = pgEnum('faq_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const topListStatusEnum = pgEnum('top_list_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const topListItemOwnerTypeEnum = pgEnum('top_list_item_owner_type', [
  'PLACE',
  'BUSINESS',
  'ATTRACTION',
]);

// ─── FAQs Table ──────────────────────────────────────────────────────────────

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: varchar('category', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(1),
    status: faqStatusEnum('status').notNull().default('DRAFT'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    displayOrderCheck: check('faqs_display_order_check', sql`${table.displayOrder} >= 1`),
    statusIdx: index('faqs_status_idx').on(table.status),
    categoryIdx: index('faqs_category_idx').on(table.category),
    displayOrderIdx: index('faqs_display_order_idx').on(table.displayOrder),
    deletedAtIdx: index('faqs_deleted_at_idx').on(table.deletedAt),
  })
);

// ─── Top Lists Table ──────────────────────────────────────────────────────────

export const topLists = pgTable(
  'top_lists',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }),
    featured: boolean('featured').notNull().default(false),
    status: topListStatusEnum('status').notNull().default('DRAFT'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugUniqIdx: uniqueIndex('top_lists_slug_uniq_idx').on(table.slug),
    statusIdx: index('top_lists_status_idx').on(table.status),
    categoryIdx: index('top_lists_category_idx').on(table.category),
    featuredIdx: index('top_lists_featured_idx').on(table.featured),
    deletedAtIdx: index('top_lists_deleted_at_idx').on(table.deletedAt),
  })
);

// ─── Top List Items Table ─────────────────────────────────────────────────────

export const topListItems = pgTable(
  'top_list_items',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    topListId: uuid('top_list_id')
      .notNull()
      .references(() => topLists.id, { onDelete: 'cascade' }),
    ownerType: topListItemOwnerTypeEnum('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    displayOrder: integer('display_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    displayOrderCheck: check('top_list_items_display_order_check', sql`${table.displayOrder} >= 1`),

    // Prevent duplicate owner in the same top list
    topListItemUniqIdx: uniqueIndex('top_list_items_uniq_idx').on(
      table.topListId,
      table.ownerType,
      table.ownerId
    ),

    // Prevent duplicate displayOrder in the same top list
    topListDisplayOrderUniqIdx: uniqueIndex('top_list_items_display_order_uniq_idx').on(
      table.topListId,
      table.displayOrder
    ),

    // Lookups
    topListIdIdx: index('top_list_items_top_list_id_idx').on(table.topListId),
    ownerIdx: index('top_list_items_owner_idx').on(table.ownerType, table.ownerId),
  })
);
