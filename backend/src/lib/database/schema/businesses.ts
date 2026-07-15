import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { amenities, businessTypes } from './references';
import { regions } from './regions';
import { point } from './shared/custom-types';

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().notNull(),
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    businessTypeId: uuid('business_type_id')
      .notNull()
      .references(() => businessTypes.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    location: point('location').notNull(),
    description: text('description'),
    coverUrl: varchar('cover_url', { length: 512 }),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive
    priceMin: numeric('price_min', { precision: 12, scale: 2 }),
    priceMax: numeric('price_max', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    priceRangeCheck: check(
      'businesses_price_range_check',
      sql`(
      (${t.priceMin} IS NULL AND ${t.priceMax} IS NULL)
      OR (
        ${t.priceMin} IS NOT NULL
        AND ${t.priceMax} IS NOT NULL
        AND ${t.priceMin} >= 0
        AND ${t.priceMax} >= ${t.priceMin}
      )
    )`
    ),
    activePriceMinIdx: index('businesses_active_price_min_idx')
      .on(t.priceMin)
      .where(sql`${t.deletedAt} IS NULL AND ${t.status} = 'active' AND ${t.priceMin} IS NOT NULL`),
    activePriceMaxIdx: index('businesses_active_price_max_idx')
      .on(t.priceMax)
      .where(sql`${t.deletedAt} IS NULL AND ${t.status} = 'active' AND ${t.priceMax} IS NOT NULL`),
    locationGistIdx: index('businesses_location_gist_idx').using('gist', t.location),
  })
);

export const businessAmenities = pgTable(
  'business_amenities',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
    note: varchar('note', { length: 100 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.businessId, t.amenityId] }),
  })
);
export type BusinessRow = typeof businesses.$inferSelect;
export type NewBusinessRow = typeof businesses.$inferInsert;
export type BusinessAmenityRow = typeof businessAmenities.$inferSelect;
export type NewBusinessAmenityRow = typeof businessAmenities.$inferInsert;
