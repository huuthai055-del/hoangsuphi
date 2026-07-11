import { pgTable, uuid, varchar, integer, boolean, timestamp, pgEnum, index, uniqueIndex, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { generateUuidV7 } from '@/common/utils/uuid';

/**
 * Status values for workflow management:
 * - draft: Editor is writing, not visible to public
 * - under_review: Submitted for review by Editor
 * - published: Publicly visible to all users
 * - archived: Taken down, historical view only
 */
export const articleStatusEnum = pgEnum('article_status', ['draft', 'under_review', 'published', 'archived']);

export const articleCategories = pgTable(
  'article_categories',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    codeUniqueIdx: uniqueIndex('article_categories_code_unique_idx').on(table.code),
  })
);

export const articles = pgTable(
  'articles',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }).notNull(),
    content: text('content').notNull(),
    // FK to media.id will be added in Sub-phase 3.7 (Media Manager)
    thumbnailId: uuid('thumbnail_id'),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => articleCategories.id, { onDelete: 'restrict' }),
    status: articleStatusEnum('status').notNull().default('draft'),
    viewCount: integer('view_count').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('articles_slug_unique_idx')
      .on(table.slug)
      .where(sql`deleted_at IS NULL`),
    statusPublishedIdx: index('articles_status_published_idx')
      .on(table.status, table.publishedAt)
      .where(sql`deleted_at IS NULL`),
    categoryIdIdx: index('articles_category_id_idx').on(table.categoryId),
  })
);
