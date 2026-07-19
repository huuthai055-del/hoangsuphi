import { generateUuidV7 } from '@/common/utils/uuid';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { regions } from './regions';
import { users } from './users';

export const harvestUpdates = pgTable(
  'harvest_updates',
  {
    id: uuid('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateUuidV7()),
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'restrict' }),
    stage: varchar('stage', { length: 50 }).notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    summary: varchar('summary', { length: 2000 }).notNull(),
    advisory: varchar('advisory', { length: 1500 }),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    stageCheck: check(
      'harvest_updates_stage_check',
      sql`stage IN ('PREPARING', 'TRANSPLANTING', 'GREEN', 'RIPENING', 'GOLDEN', 'HARVESTING', 'OFF_SEASON')`
    ),
    statusCheck: check(
      'harvest_updates_status_check',
      sql`status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')`
    ),
    publishedAtCheck: check(
      'harvest_updates_published_at_check',
      sql`(status = 'DRAFT' AND published_at IS NULL) OR (status IN ('PUBLISHED', 'ARCHIVED') AND published_at IS NOT NULL)`
    ),
    publicTimelineIdx: index('harvest_updates_public_timeline_idx')
      .on(table.regionId, table.observedAt, table.id)
      .where(sql`status = 'PUBLISHED' AND deleted_at IS NULL`),
  })
);
