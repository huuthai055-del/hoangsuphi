import { pgTable, uuid, varchar, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { regions } from './regions';
import { businessTypes, amenities } from './references';
import { point } from './shared/custom-types';

export const businesses = pgTable('businesses', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
