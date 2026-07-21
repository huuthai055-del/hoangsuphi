import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const businessPublicContacts = pgTable(
  'business_public_contacts',
  {
    businessId: uuid('business_id')
      .primaryKey()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    phoneE164: varchar('phone_e164', { length: 16 }),
    zaloUrl: varchar('zalo_url', { length: 512 }),
    websiteUrl: varchar('website_url', { length: 512 }),
    publicationStatus: varchar('publication_status', { length: 20 }).notNull().default('draft'),
    consentConfirmedAt: timestamp('consent_confirmed_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    publicationStatusCheck: check(
      'business_public_contacts_publication_status_check',
      sql`${table.publicationStatus} IN ('draft', 'published')`
    ),
    phoneFormatCheck: check(
      'business_public_contacts_phone_format_check',
      sql`${table.phoneE164} IS NULL OR ${table.phoneE164} ~ '^\\+[1-9][0-9]{7,14}$'`
    ),
    zaloUrlCheck: check(
      'business_public_contacts_zalo_url_check',
      sql`${table.zaloUrl} IS NULL OR ${table.zaloUrl} ~ '^https://zalo\\.me/[A-Za-z0-9._-]+/?$'`
    ),
    websiteUrlCheck: check(
      'business_public_contacts_website_url_check',
      sql`${table.websiteUrl} IS NULL OR ${table.websiteUrl} ~ '^https://[^[:space:]]+$'`
    ),
    publishedContactCheck: check(
      'business_public_contacts_published_check',
      sql`${table.publicationStatus} <> 'published' OR (
        ${table.deletedAt} IS NULL
        AND ${table.consentConfirmedAt} IS NOT NULL
        AND ${table.verifiedAt} IS NOT NULL
        AND (${table.phoneE164} IS NOT NULL OR ${table.zaloUrl} IS NOT NULL OR ${table.websiteUrl} IS NOT NULL)
      )`
    ),
    publishedIdx: index('business_public_contacts_published_idx')
      .on(table.verifiedAt, table.businessId)
      .where(sql`${table.publicationStatus} = 'published' AND ${table.deletedAt} IS NULL`),
  })
);

export type BusinessPublicContactRow = typeof businessPublicContacts.$inferSelect;
export type NewBusinessPublicContactRow = typeof businessPublicContacts.$inferInsert;
