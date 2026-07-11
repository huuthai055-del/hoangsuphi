import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex, primaryKey, text } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { generateUuidV7 } from '@/common/utils/uuid';

export const tags = pgTable(
  'tags',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    isFeatured: boolean('is_featured').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('tags_slug_unique_idx').on(table.slug),
    nameUniqueIdx: uniqueIndex('tags_name_unique_idx').on(table.name),
    isFeaturedIdx: index('tags_is_featured_idx').on(table.isFeatured),
  })
);

export const articleTags = pgTable(
  'article_tags',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.articleId, table.tagId] }),
    tagIdIdx: index('article_tags_tag_id_idx').on(table.tagId),
  })
);
