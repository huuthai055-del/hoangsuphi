import { pgTable, uuid, varchar, integer, timestamp, text, pgEnum, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { generateUuidV7 } from '@/common/utils/uuid';

// 1. Enums
export const itineraryVisibilityEnum = pgEnum('itinerary_visibility', ['PUBLIC', 'PRIVATE']);
export const itineraryStatusEnum = pgEnum('itinerary_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const itineraryItemOwnerTypeEnum = pgEnum('itinerary_item_owner_type', ['PLACE', 'BUSINESS', 'ATTRACTION']);

// 2. Itineraries Table
export const itineraries = pgTable(
  'itineraries',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    visibility: itineraryVisibilityEnum('visibility').notNull().default('PRIVATE'),
    status: itineraryStatusEnum('status').notNull().default('DRAFT'),
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
    createdByIdx: index('itineraries_created_by_idx').on(table.createdBy),
    statusIdx: index('itineraries_status_idx').on(table.status),
    createdAtIdx: index('itineraries_created_at_idx').on(table.createdAt),
  })
);

// 3. Itinerary Items Table
export const itineraryItems = pgTable(
  'itinerary_items',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    itineraryId: uuid('itinerary_id')
      .notNull()
      .references(() => itineraries.id, { onDelete: 'cascade' }),
    ownerType: itineraryItemOwnerTypeEnum('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    dayNumber: integer('day_number').notNull(),
    displayOrder: integer('display_order').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Check constraints for values
    dayNumberCheck: check('itinerary_items_day_number_check', sql`${table.dayNumber} >= 1 AND ${table.dayNumber} <= 365`),
    displayOrderCheck: check('itinerary_items_display_order_check', sql`${table.displayOrder} >= 1`),

    // Unique index to prevent duplicate ownerType and ownerId in the same itinerary
    itineraryItemUniqIdx: uniqueIndex('itinerary_items_uniq_idx').on(
      table.itineraryId,
      table.ownerType,
      table.ownerId
    ),

    // Unique index to prevent duplicate displayOrder in the same day of the itinerary
    itineraryDayDisplayOrderUniqIdx: uniqueIndex('itinerary_items_day_order_uniq_idx').on(
      table.itineraryId,
      table.dayNumber,
      table.displayOrder
    ),

    // Lookups
    itineraryIdIdx: index('itinerary_items_itinerary_id_idx').on(table.itineraryId),
    ownerIdx: index('itinerary_items_owner_idx').on(table.ownerType, table.ownerId),
  })
);
