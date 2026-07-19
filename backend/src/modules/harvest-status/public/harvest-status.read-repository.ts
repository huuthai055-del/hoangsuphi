import type { Database } from '@/lib/database/client';
import { harvestUpdates, media, mediaVariants, regions } from '@/lib/database/schema';
import { type SQL, sql } from 'drizzle-orm';
import type { HarvestStage } from '../repository/harvest-status.repository.interface';
import type {
  HarvestCurrentProjection,
  HarvestPublicMediaSource,
  HarvestPublicRegionProjection,
  HarvestPublicUpdateProjection,
  HarvestTimelineProjection,
  IHarvestStatusReadRepository,
} from './harvest-status.read-repository.interface';

const HARVEST_STAGES: readonly HarvestStage[] = [
  'PREPARING',
  'TRANSPLANTING',
  'GREEN',
  'RIPENING',
  'GOLDEN',
  'HARVESTING',
  'OFF_SEASON',
];

interface RawMediaSource {
  id: string;
  storageProvider: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  variant: string;
}

interface RawCurrentRow extends Record<string, unknown> {
  regionId: string;
  regionName: string;
  regionSlug: string;
  regionLevel: number;
  updateId: string;
  stage: string;
  observedAt: Date | string;
  title: string;
  summary: string;
  advisory: string | null;
  publishedAt: Date | string;
  media: unknown;
}

interface RawTimelineRow extends Record<string, unknown> {
  rowKind: string;
  updateId: string;
  stage: string;
  observedAt: Date | string;
  title: string;
  summary: string;
  advisory: string | null;
  publishedAt: Date | string;
  media: unknown;
}

interface RawRegionRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  level: number;
}

export class HarvestReadRepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Harvest public read ${operation} failed`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = 'HarvestReadRepositoryError';
  }
}

class HarvestReadInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HarvestReadInvariantError';
  }
}

export class DrizzleHarvestStatusReadRepository implements IHarvestStatusReadRepository {
  constructor(private readonly database: Database) {}

  async findCurrentPage(criteria: {
    limit: number;
    after: import('./harvest-status.cursor').HarvestCurrentKeyset | null;
  }): Promise<HarvestCurrentProjection[]> {
    const after = criteria.after;
    const keysetCondition = after
      ? sql`AND (
          "observedAt" < ${after.observedAt.toISOString()}::timestamptz
          OR ("observedAt" = ${after.observedAt.toISOString()}::timestamptz AND "regionName" > ${after.regionName})
          OR (
            "observedAt" = ${after.observedAt.toISOString()}::timestamptz
            AND "regionName" = ${after.regionName}
            AND "regionId" > ${after.regionId}::uuid
          )
        )`
      : sql``;

    const statement = sql`
      WITH "ranked_updates" AS (
        SELECT
          ${harvestUpdates.id} AS "updateId",
          ${harvestUpdates.regionId} AS "regionId",
          ${harvestUpdates.stage} AS "stage",
          ${harvestUpdates.observedAt} AS "observedAt",
          ${harvestUpdates.title} AS "title",
          ${harvestUpdates.summary} AS "summary",
          ${harvestUpdates.advisory} AS "advisory",
          ${harvestUpdates.publishedAt} AS "publishedAt",
          ROW_NUMBER() OVER (
            PARTITION BY ${harvestUpdates.regionId}
            ORDER BY ${harvestUpdates.observedAt} DESC, ${harvestUpdates.publishedAt} DESC, ${harvestUpdates.id} DESC
          ) AS "currentRank"
        FROM ${harvestUpdates}
        WHERE ${harvestUpdates.status} = 'PUBLISHED'
          AND ${harvestUpdates.deletedAt} IS NULL
      ),
      "current_rows" AS (
        SELECT
          ${regions.id} AS "regionId",
          ${regions.name}::text AS "regionName",
          ${regions.slug}::text AS "regionSlug",
          ${regions.level}::integer AS "regionLevel",
          "ranked_updates"."updateId",
          "ranked_updates"."stage",
          "ranked_updates"."observedAt",
          "ranked_updates"."title",
          "ranked_updates"."summary",
          "ranked_updates"."advisory",
          "ranked_updates"."publishedAt"
        FROM "ranked_updates"
        INNER JOIN ${regions} ON ${regions.id} = "ranked_updates"."regionId"
        WHERE "ranked_updates"."currentRank" = 1
          AND ${regions.level} IN (3, 4)
          AND ${regions.deletedAt} IS NULL
      )
      SELECT
        "current_rows".*,
        ${this.buildMediaProjection(sql`"current_rows"."updateId"`)} AS "media"
      FROM "current_rows"
      WHERE TRUE ${keysetCondition}
      ORDER BY "observedAt" DESC, "regionName" ASC, "regionId" ASC
      LIMIT ${criteria.limit + 1}::integer
    `;

    const rows = await this.executeRows<RawCurrentRow>(statement, 'current page');
    return rows.map((row) => ({
      region: this.mapRegion(row),
      current: this.mapUpdate(row),
    }));
  }

  async findPublicRegionBySlug(slug: string): Promise<HarvestPublicRegionProjection | null> {
    const statement = sql`
      SELECT
        ${regions.id} AS "id",
        ${regions.name}::text AS "name",
        ${regions.slug}::text AS "slug",
        ${regions.level}::integer AS "level"
      FROM ${regions}
      WHERE ${regions.slug} = ${slug}
        AND ${regions.level} IN (3, 4)
        AND ${regions.deletedAt} IS NULL
      LIMIT 1
    `;
    const rows = await this.executeRows<RawRegionRow>(statement, 'region resolution');
    const row = rows[0];
    return row ? this.assertRegion(row) : null;
  }

  async findRegionTimeline(criteria: {
    regionId: string;
    limit: number;
    after: import('./harvest-status.cursor').HarvestTimelineKeyset | null;
  }): Promise<HarvestTimelineProjection> {
    const after = criteria.after;
    const keysetCondition = after
      ? sql`AND (
          ${harvestUpdates.observedAt} < ${after.observedAt.toISOString()}::timestamptz
          OR (${harvestUpdates.observedAt} = ${after.observedAt.toISOString()}::timestamptz AND ${harvestUpdates.publishedAt} < ${after.publishedAt.toISOString()}::timestamptz)
          OR (
            ${harvestUpdates.observedAt} = ${after.observedAt.toISOString()}::timestamptz
            AND ${harvestUpdates.publishedAt} = ${after.publishedAt.toISOString()}::timestamptz
            AND ${harvestUpdates.id} < ${after.id}::uuid
          )
        )`
      : sql``;

    const statement = sql`
      WITH "global_current" AS (
        SELECT
          ${harvestUpdates.id} AS "updateId",
          ${harvestUpdates.stage} AS "stage",
          ${harvestUpdates.observedAt} AS "observedAt",
          ${harvestUpdates.title} AS "title",
          ${harvestUpdates.summary} AS "summary",
          ${harvestUpdates.advisory} AS "advisory",
          ${harvestUpdates.publishedAt} AS "publishedAt"
        FROM ${harvestUpdates}
        WHERE ${harvestUpdates.regionId} = ${criteria.regionId}::uuid
          AND ${harvestUpdates.status} = 'PUBLISHED'
          AND ${harvestUpdates.deletedAt} IS NULL
        ORDER BY ${harvestUpdates.observedAt} DESC, ${harvestUpdates.publishedAt} DESC, ${harvestUpdates.id} DESC
        LIMIT 1
      ),
      "timeline_page" AS (
        SELECT
          ${harvestUpdates.id} AS "updateId",
          ${harvestUpdates.stage} AS "stage",
          ${harvestUpdates.observedAt} AS "observedAt",
          ${harvestUpdates.title} AS "title",
          ${harvestUpdates.summary} AS "summary",
          ${harvestUpdates.advisory} AS "advisory",
          ${harvestUpdates.publishedAt} AS "publishedAt"
        FROM ${harvestUpdates}
        WHERE ${harvestUpdates.regionId} = ${criteria.regionId}::uuid
          AND ${harvestUpdates.status} = 'PUBLISHED'
          AND ${harvestUpdates.deletedAt} IS NULL
          ${keysetCondition}
        ORDER BY ${harvestUpdates.observedAt} DESC, ${harvestUpdates.publishedAt} DESC, ${harvestUpdates.id} DESC
        LIMIT ${criteria.limit + 1}::integer
      ),
      "selected_updates" AS (
        SELECT 'CURRENT'::text AS "rowKind", "global_current".* FROM "global_current"
        UNION ALL
        SELECT 'TIMELINE'::text AS "rowKind", "timeline_page".* FROM "timeline_page"
      )
      SELECT
        "selected_updates".*,
        ${this.buildMediaProjection(sql`"selected_updates"."updateId"`)} AS "media"
      FROM "selected_updates"
      ORDER BY
        CASE WHEN "rowKind" = 'CURRENT' THEN 0 ELSE 1 END,
        "observedAt" DESC,
        "publishedAt" DESC,
        "updateId" DESC
    `;

    const rows = await this.executeRows<RawTimelineRow>(statement, 'region timeline');
    const currentRow = rows.find((row) => row.rowKind === 'CURRENT');
    return {
      current: currentRow ? this.mapUpdate(currentRow) : null,
      timeline: rows
        .filter((row) => row.rowKind === 'TIMELINE')
        .map((row) => this.mapUpdate(row)),
    };
  }

  private buildMediaProjection(updateId: SQL): SQL {
    return sql`COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', "eligible_media"."id",
          'storageProvider', "eligible_media"."storageProvider",
          'storageKey', "eligible_media"."storageKey",
          'width', "eligible_media"."width",
          'height', "eligible_media"."height",
          'altText', "eligible_media"."altText",
          'variant', "eligible_media"."variant"
        ) ORDER BY "eligible_media"."createdAt" ASC, "eligible_media"."id" ASC
      )
      FROM (
        SELECT
          ${media.id} AS "id",
          ${media.storageProvider}::text AS "storageProvider",
          COALESCE("preferred_variant"."storageKey", ${media.storageKey})::text AS "storageKey",
          "preferred_variant"."width"::integer AS "width",
          "preferred_variant"."height"::integer AS "height",
          ${media.altText}::text AS "altText",
          COALESCE("preferred_variant"."variant", 'original')::text AS "variant",
          ${media.createdAt} AS "createdAt"
        FROM ${media}
        LEFT JOIN LATERAL (
          SELECT
            ${mediaVariants.storageKey}::text AS "storageKey",
            ${mediaVariants.width}::integer AS "width",
            ${mediaVariants.height}::integer AS "height",
            ${mediaVariants.variantType}::text AS "variant"
          FROM ${mediaVariants}
          WHERE ${mediaVariants.mediaId} = ${media.id}
            AND ${mediaVariants.variantType} IN ('large', 'medium', 'original')
          ORDER BY
            CASE ${mediaVariants.variantType}
              WHEN 'large' THEN 0
              WHEN 'medium' THEN 1
              WHEN 'original' THEN 2
              ELSE 3
            END,
            ${mediaVariants.variantType} ASC,
            ${mediaVariants.id} ASC
          LIMIT 1
        ) AS "preferred_variant" ON TRUE
        WHERE ${media.ownerType} = 'HARVEST_UPDATE'
          AND ${media.ownerId} = ${updateId}
          AND ${media.mediaType} = 'IMAGE'
          AND ${media.status} = 'READY'
          AND ${media.deletedAt} IS NULL
        ORDER BY ${media.createdAt} ASC, ${media.id} ASC
        LIMIT 8
      ) AS "eligible_media"
    ), '[]'::jsonb)`;
  }

  private mapRegion(row: RawCurrentRow): HarvestPublicRegionProjection {
    return this.assertRegion({
      id: row.regionId,
      name: row.regionName,
      slug: row.regionSlug,
      level: Number(row.regionLevel),
    });
  }

  private assertRegion(row: HarvestPublicRegionProjection): HarvestPublicRegionProjection {
    if (!row.id || !row.name || !row.slug || (Number(row.level) !== 3 && Number(row.level) !== 4)) {
      throw new HarvestReadInvariantError('Harvest public region projection is invalid');
    }
    return { ...row, level: Number(row.level) };
  }

  private mapUpdate(row: RawCurrentRow | RawTimelineRow): HarvestPublicUpdateProjection {
    const observedAt = this.toDate(row.observedAt);
    const publishedAt = this.toDate(row.publishedAt);
    if (
      !row.updateId ||
      !HARVEST_STAGES.includes(row.stage as HarvestStage) ||
      !observedAt ||
      !publishedAt ||
      !row.title ||
      !row.summary
    ) {
      throw new HarvestReadInvariantError('Harvest public update projection is invalid');
    }
    return {
      id: row.updateId,
      stage: row.stage as HarvestStage,
      observedAt,
      title: row.title,
      summary: row.summary,
      advisory: row.advisory,
      publishedAt,
      media: this.mapMedia(row.media),
    };
  }

  private toDate(value: Date | string): Date | null {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private mapMedia(value: unknown): HarvestPublicMediaSource[] {
    if (!Array.isArray(value)) throw new HarvestReadInvariantError('Harvest media projection is invalid');
    return value.map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('id' in item) ||
        !('storageProvider' in item) ||
        !('storageKey' in item) ||
        !('variant' in item)
      ) {
        throw new HarvestReadInvariantError('Harvest media item is invalid');
      }
      const raw = item as RawMediaSource;
      if (
        typeof raw.id !== 'string' ||
        (raw.storageProvider !== 'LOCAL' && raw.storageProvider !== 'CLOUDINARY') ||
        typeof raw.storageKey !== 'string' ||
        typeof raw.variant !== 'string'
      ) {
        throw new HarvestReadInvariantError('Harvest media item is invalid');
      }
      return {
        id: raw.id,
        storageProvider: raw.storageProvider,
        storageKey: raw.storageKey,
        width: raw.width === null ? null : Number(raw.width),
        height: raw.height === null ? null : Number(raw.height),
        altText: raw.altText,
        variant: raw.variant,
      };
    });
  }

  private async executeRows<TRow extends Record<string, unknown>>(
    statement: SQL,
    operation: string
  ): Promise<TRow[]> {
    try {
      const result = await this.database.execute<TRow>(statement);
      return Array.from(result) as unknown as TRow[];
    } catch (error) {
      if (error instanceof HarvestReadInvariantError) throw error;
      throw new HarvestReadRepositoryError(operation, error);
    }
  }
}
