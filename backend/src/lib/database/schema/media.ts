import { pgTable, uuid, varchar, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { generateUuidV7 } from '@/common/utils/uuid';

/**
 * Media Table - Stores original uploaded file information
 */
export const media = pgTable(
  'media',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    mediaType: varchar('media_type', { length: 50 }).notNull(), // 'IMAGE', 'VIDEO', 'DOCUMENT'
    fileSize: integer('file_size').notNull(),
    hash: varchar('hash', { length: 64 }).notNull(), // SHA-256 file hash for deduplication
    status: varchar('status', { length: 50 }).notNull().default('UPLOADING'), // 'UPLOADING', 'READY', 'PROCESSING', 'FAILED', 'DELETED'
    
    // Polymorphic owner association (the content entity this media illustrates)
    ownerType: varchar('owner_type', { length: 50 }), // 'ARTICLE', 'PLACE', 'BUSINESS', 'ATTRACTION', 'USER'
    ownerId: uuid('owner_id'),

    // Uploader identity — set at upload time, used for access control
    uploadedBy: uuid('uploaded_by'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    hashIdx: index('media_hash_idx').on(table.hash),
    ownerIdx: index('media_owner_idx').on(table.ownerType, table.ownerId),
    statusIdx: index('media_status_idx').on(table.status),
    createdAtIdx: index('media_created_at_idx').on(table.createdAt),
  })
);

/**
 * Media Variants Table - Stores different resized versions of images (e.g. thumbnail, medium, large)
 */
export const mediaVariants = pgTable(
  'media_variants',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    variantType: varchar('variant_type', { length: 50 }).notNull(), // 'original', 'thumbnail', 'medium', 'large'
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    width: integer('width'),
    height: integer('height'),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mediaIdIdx: index('media_variants_media_id_idx').on(table.mediaId),
  })
);

/**
 * Media Metadata Table - Stores EXIF data, GPS, and technical specifications
 */
export const mediaMetadata = pgTable(
  'media_metadata',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata').notNull(), // Flexible structured json for EXIF/GPS info
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mediaIdIdx: index('media_metadata_media_id_idx').on(table.mediaId),
  })
);
