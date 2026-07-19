import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { attractionCategories } from './references';
import { regions } from './regions';
import { point } from './shared/custom-types';

export const attractions = pgTable(
  'attractions',
  {
    id: uuid('id').primaryKey().notNull(),
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => attractionCategories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    location: point('location').notNull(),
    description: text('description'),
    coverUrl: varchar('cover_url', { length: 512 }),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    regionIdIdx: index('attractions_region_id_idx').on(table.regionId),
    categoryIdIdx: index('attractions_category_id_idx').on(table.categoryId),
    locationGistIdx: index('attractions_location_gist_idx').using('gist', table.location),
  })
);

export type AttractionRow = typeof attractions.$inferSelect;
export type NewAttractionRow = typeof attractions.$inferInsert;
