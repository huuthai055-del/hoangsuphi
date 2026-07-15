import {
  pgTable,
  uuid,
  varchar,
  smallint,
  text,
  decimal,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { point, ltree } from './shared/custom-types';

export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => regions.id, {
    onDelete: 'restrict',
  }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  level: smallint('level').notNull(), // 0=Country, 1=Province, 2=District, 3=Commune, 4=Village, 5=Point
  path: ltree('path').notNull(),
  description: text('description'),
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  geom: point('geom'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const touristPlaces = pgTable('tourist_places', {
  id: uuid('id').primaryKey().notNull(),
  regionId: uuid('region_id')
    .notNull()
    .references(() => regions.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  location: point('location').notNull(),
  description: text('description'),
  coverUrl: varchar('cover_url', { length: 512 }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  locationGistIdx: index('tourist_places_location_gist_idx').using('gist', table.location),
}));
