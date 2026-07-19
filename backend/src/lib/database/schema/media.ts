import { generateUuidV7 } from '@/common/utils/uuid';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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
    storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('LOCAL'), // 'LOCAL', 'CLOUDINARY'
    altText: varchar('alt_text', { length: 255 }),
    caption: varchar('caption', { length: 500 }),

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
    scopedHashIdx: index('media_scoped_hash_idx').on(
      table.uploadedBy,
      table.ownerType,
      table.ownerId,
      table.hash
    ),
    unboundActiveHashUniqueIdx: uniqueIndex('media_unbound_active_hash_unique_idx')
      .on(table.uploadedBy, table.hash)
      .where(
        sql`owner_type IS NULL AND owner_id IS NULL AND deleted_at IS NULL AND status IN ('UPLOADING', 'PROCESSING', 'READY')`
      ),
    ownerPairCheck: check(
      'media_owner_pair_check',
      sql`(owner_type IS NULL AND owner_id IS NULL) OR (owner_type IS NOT NULL AND owner_id IS NOT NULL)`
    ),
    storageProviderCheck: check(
      'media_storage_provider_check',
      sql`storage_provider IN ('LOCAL', 'CLOUDINARY')`
    ),
    activeUnboundUploaderCheck: check(
      'media_active_unbound_uploader_check',
      sql`NOT (
        owner_type IS NULL
        AND owner_id IS NULL
        AND deleted_at IS NULL
        AND status IN ('UPLOADING', 'PROCESSING', 'READY')
        AND uploaded_by IS NULL
      )`
    ),
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
    mediaIdVariantTypeUniqueIdx: uniqueIndex('media_variants_media_id_variant_type_unique_idx').on(
      table.mediaId,
      table.variantType
    ),
  })
);

/**
 * Media Metadata Table - Stores allowlisted technical specifications only.
 * Raw EXIF/GPS data is intentionally never persisted for public media.
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
    metadata: jsonb('metadata').notNull(), // Sanitized width/height/output metadata only
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mediaIdIdx: index('media_metadata_media_id_idx').on(table.mediaId),
    mediaIdUniqueIdx: uniqueIndex('media_metadata_media_id_unique_idx').on(table.mediaId),
  })
);
