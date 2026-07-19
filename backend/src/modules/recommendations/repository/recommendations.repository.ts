import type { Database } from '@/lib/database/client';
import {
  articles,
  attractions,
  businessTypes,
  businesses,
  regions,
  reviews,
  touristPlaces,
} from '@/lib/database/schema';
import { type SQL, sql } from 'drizzle-orm';
import type {
  RecommendationQueryCriteria,
  IRecommendationsRepository,
} from './recommendations-repository.interface';
import type {
  RecommendationReadProjection,
  RecommendationSourceProjection,
} from './recommendation-projection';
import type { RecommendationSourceType } from '../dto/recommendations.dto';

interface RawResultRow extends Record<string, unknown> {
  entityType: string;
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  distanceMeters: number | null;
}

const candidateProjectionFields = sql`
  "entityType",
  "id",
  "name",
  "slug",
  "thumbnailUrl",
  "regionId",
  "regionName",
  "regionSlug",
  "ratingAverage",
  "ratingCount",
  "distanceMeters"
`;

export class RecommendationsRepositoryOperationError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Recommendations repository ${operation} failed`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = 'RecommendationsRepositoryOperationError';
  }
}

class RecommendationRepositoryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationRepositoryInvariantError';
  }
}

function isRecommendationEntityType(
  value: string
): value is RecommendationReadProjection['entityType'] {
  return value === 'ARTICLE' || value === 'PLACE' || value === 'BUSINESS' || value === 'ATTRACTION';
}

export class DrizzleRecommendationsRepository implements IRecommendationsRepository {
  constructor(private readonly database: Database) {}

  async resolvePublicSource(
    sourceType: RecommendationSourceType,
    sourceId: string
  ): Promise<RecommendationSourceProjection | null> {
    let querySql: SQL;

    switch (sourceType) {
      case 'place':
        querySql = sql`
          SELECT
            'place'::text AS "sourceType",
            ${touristPlaces.id} AS "id",
            ${touristPlaces.regionId} AS "regionId",
            ST_X(${touristPlaces.location}::geometry)::double precision AS "x",
            ST_Y(${touristPlaces.location}::geometry)::double precision AS "y"
          FROM ${touristPlaces}
          INNER JOIN ${regions} ON ${regions.id} = ${touristPlaces.regionId}
          WHERE ${touristPlaces.id} = ${sourceId}::uuid
            AND ${touristPlaces.status} = 'active'
            AND ${touristPlaces.deletedAt} IS NULL
            AND ${regions.deletedAt} IS NULL
        `;
        break;
      case 'business':
        querySql = sql`
          SELECT
            'business'::text AS "sourceType",
            ${businesses.id} AS "id",
            ${businesses.regionId} AS "regionId",
            ST_X(${businesses.location}::geometry)::double precision AS "x",
            ST_Y(${businesses.location}::geometry)::double precision AS "y"
          FROM ${businesses}
          INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
          INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
          WHERE ${businesses.id} = ${sourceId}::uuid
            AND ${businesses.status} = 'active'
            AND ${businesses.deletedAt} IS NULL
            AND ${regions.deletedAt} IS NULL
            AND ${businessTypes.isActive} = TRUE
        `;
        break;
      case 'attraction':
        querySql = sql`
          SELECT
            'attraction'::text AS "sourceType",
            ${attractions.id} AS "id",
            ${attractions.regionId} AS "regionId",
            ST_X(${attractions.location}::geometry)::double precision AS "x",
            ST_Y(${attractions.location}::geometry)::double precision AS "y"
          FROM ${attractions}
          INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
          WHERE ${attractions.id} = ${sourceId}::uuid
            AND ${attractions.status} = 'active'
            AND ${attractions.deletedAt} IS NULL
            AND ${regions.deletedAt} IS NULL
        `;
        break;
      default:
        return null;
    }

    const rows = await this.executeRows<{
      sourceType: string;
      id: string;
      regionId: string;
      x: number;
      y: number;
    }>(querySql, 'public source resolution');
    if (rows.length === 0) return null;

    const row = rows[0];
    if (!row) return null;
    if (
      row.sourceType !== sourceType ||
      row.id !== sourceId ||
      !row.regionId ||
      !Number.isFinite(Number(row.x)) ||
      !Number.isFinite(Number(row.y))
    ) {
      throw new RecommendationRepositoryInvariantError(
        'Public recommendation source projection is invalid'
      );
    }
    return {
      sourceType: row.sourceType as RecommendationSourceType,
      id: row.id,
      regionId: row.regionId,
      location: { x: Number(row.x), y: Number(row.y) },
    };
  }

  async findNearby(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]> {
    if (!criteria.sourceProjection?.location) return [];

    const origin = criteria.sourceProjection.location;
    const originCte = sql`
      "origin" AS (
        SELECT ST_SetSRID(ST_MakePoint(${origin.x}, ${origin.y}), 4326)::geography AS "point"
      )
    `;

    const excludeCondition = sql`"id" != ${criteria.sourceId}::uuid`;
    
    // For nearby we don't have radius limits, we just order by ST_Distance
    const placeBranch = this.buildPlaceSelect(
      sql`ST_Distance(${touristPlaces.location}, "origin"."point", true)::double precision`,
      true
    );
    const businessBranch = this.buildBusinessSelect(
      sql`ST_Distance(${businesses.location}, "origin"."point", true)::double precision`,
      true
    );
    const attractionBranch = this.buildAttractionSelect(
      sql`ST_Distance(${attractions.location}, "origin"."point", true)::double precision`,
      true
    );

    const finalSql = sql`
      WITH ${originCte}
      SELECT ${candidateProjectionFields} FROM (
        ${placeBranch}
        UNION ALL
        ${businessBranch}
        UNION ALL
        ${attractionBranch}
      ) AS "candidates"
      WHERE ${excludeCondition}
      ORDER BY "distanceMeters" ASC NULLS LAST, "ratingAverage" DESC NULLS LAST, "ratingCount" DESC, "newestValue" DESC, "entityOrder" ASC, "id" ASC
      LIMIT ${criteria.limit}::integer
    `;

    const rows = await this.executeRows<RawResultRow>(finalSql, 'nearby recommendations');
    return rows.map(this.mapRawRow);
  }

  async findSameRegion(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]> {
    if (!criteria.sourceProjection?.regionId) return [];

    const excludeCondition = sql`"id" != ${criteria.sourceId}::uuid`;
    const regionCondition = sql`"regionId" = ${criteria.sourceProjection.regionId}::uuid`;

    const placeBranch = this.buildPlaceSelect(sql`NULL::double precision`);
    const businessBranch = this.buildBusinessSelect(sql`NULL::double precision`);
    const attractionBranch = this.buildAttractionSelect(sql`NULL::double precision`);

    const finalSql = sql`
      SELECT ${candidateProjectionFields} FROM (
        ${placeBranch}
        UNION ALL
        ${businessBranch}
        UNION ALL
        ${attractionBranch}
      ) AS "candidates"
      WHERE ${excludeCondition} AND ${regionCondition}
      ORDER BY "ratingAverage" DESC NULLS LAST, "ratingCount" DESC, "newestValue" DESC, "entityOrder" ASC, "id" ASC
      LIMIT ${criteria.limit}::integer
    `;

    const rows = await this.executeRows<RawResultRow>(finalSql, 'same-region recommendations');
    return rows.map(this.mapRawRow);
  }

  async findTopRated(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]> {
    const articleBranch = this.buildArticleSelect(sql`NULL::double precision`);
    const placeBranch = this.buildPlaceSelect(sql`NULL::double precision`);
    const businessBranch = this.buildBusinessSelect(sql`NULL::double precision`);
    const attractionBranch = this.buildAttractionSelect(sql`NULL::double precision`);

    const finalSql = sql`
      SELECT ${candidateProjectionFields} FROM (
        ${articleBranch}
        UNION ALL
        ${placeBranch}
        UNION ALL
        ${businessBranch}
        UNION ALL
        ${attractionBranch}
      ) AS "candidates"
      WHERE "ratingCount" > 0
      ORDER BY "ratingAverage" DESC NULLS LAST, "ratingCount" DESC, "newestValue" DESC, "entityOrder" ASC, "id" ASC
      LIMIT ${criteria.limit}::integer
    `;

    const rows = await this.executeRows<RawResultRow>(finalSql, 'top-rated recommendations');
    return rows.map(this.mapRawRow);
  }

  async findNewest(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]> {
    const articleBranch = this.buildArticleSelect(sql`NULL::double precision`);
    const placeBranch = this.buildPlaceSelect(sql`NULL::double precision`);
    const businessBranch = this.buildBusinessSelect(sql`NULL::double precision`);
    const attractionBranch = this.buildAttractionSelect(sql`NULL::double precision`);

    const finalSql = sql`
      SELECT ${candidateProjectionFields} FROM (
        ${articleBranch}
        UNION ALL
        ${placeBranch}
        UNION ALL
        ${businessBranch}
        UNION ALL
        ${attractionBranch}
      ) AS "candidates"
      ORDER BY "newestValue" DESC NULLS LAST, "entityOrder" ASC, "id" ASC
      LIMIT ${criteria.limit}::integer
    `;

    const rows = await this.executeRows<RawResultRow>(finalSql, 'newest recommendations');
    return rows.map(this.mapRawRow);
  }

  private mapRawRow(row: RawResultRow): RecommendationReadProjection {
    if (!isRecommendationEntityType(row.entityType)) {
      throw new RecommendationRepositoryInvariantError(
        'Recommendation query returned an unknown entity type'
      );
    }
    if (!row.id || !row.name || !row.slug) {
      throw new RecommendationRepositoryInvariantError('Recommendation query returned an incomplete item');
    }
    if (
      (row.regionId === null && (row.regionName !== null || row.regionSlug !== null)) ||
      (row.regionId !== null && (row.regionName === null || row.regionSlug === null)) ||
      !Number.isFinite(Number(row.ratingCount)) ||
      Number(row.ratingCount) < 0 ||
      (row.ratingAverage !== null &&
        (!Number.isFinite(Number(row.ratingAverage)) ||
          Number(row.ratingAverage) < 1 ||
          Number(row.ratingAverage) > 5)) ||
      (row.distanceMeters !== null &&
        (!Number.isFinite(Number(row.distanceMeters)) || Number(row.distanceMeters) < 0))
    ) {
      throw new RecommendationRepositoryInvariantError('Recommendation query returned an invalid item');
    }
    return {
      entityType: row.entityType,
      id: row.id,
      name: row.name,
      slug: row.slug,
      thumbnailUrl: row.thumbnailUrl,
      regionId: row.regionId,
      regionName: row.regionName,
      regionSlug: row.regionSlug,
      ratingAverage: row.ratingAverage !== null ? Number(row.ratingAverage) : null,
      ratingCount: Number(row.ratingCount),
      distanceMeters: row.distanceMeters !== null ? Number(row.distanceMeters) : null,
    };
  }

  private async executeRows<TRow extends Record<string, unknown>>(
    statement: SQL,
    operation: string
  ): Promise<TRow[]> {
    try {
      const result = await this.database.execute<TRow>(statement);
      return Array.from(result) as unknown as TRow[];
    } catch (error) {
      throw new RecommendationsRepositoryOperationError(operation, error);
    }
  }

  private buildArticleSelect(distanceSql: SQL): SQL {
    return sql`
      SELECT
        'ARTICLE'::text AS "entityType",
        1::integer AS "entityOrder",
        ${articles.id} AS "id",
        ${articles.title}::text AS "name",
        ${articles.slug}::text AS "slug",
        NULL::text AS "thumbnailUrl",
        NULL::uuid AS "regionId",
        NULL::text AS "regionName",
        NULL::text AS "regionSlug",
        ${distanceSql} AS "distanceMeters",
        "rec_ratings"."raw_rating" AS "ratingAverage",
        COALESCE("rec_ratings"."review_count", 0)::integer AS "ratingCount",
        ${articles.publishedAt} AS "newestValue"
      FROM ${articles}
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(rating::numeric), 2)::double precision AS "raw_rating",
          COUNT(id)::integer AS "review_count"
        FROM ${reviews}
        WHERE owner_type = 'ARTICLE'::public.owner_type
          AND owner_id = ${articles.id}
          AND status = 'APPROVED'::public.review_status
          AND deleted_at IS NULL
      ) AS "rec_ratings" ON true
      WHERE ${articles.status} = 'published'::public.article_status
        AND ${articles.deletedAt} IS NULL
        AND ${articles.publishedAt} <= CURRENT_TIMESTAMP
    `;
  }

  private buildPlaceSelect(distanceSql: SQL, includeOrigin = false): SQL {
    return sql`
      SELECT
        'PLACE'::text AS "entityType",
        2::integer AS "entityOrder",
        ${touristPlaces.id} AS "id",
        ${touristPlaces.name}::text AS "name",
        ${touristPlaces.slug}::text AS "slug",
        ${touristPlaces.coverUrl}::text AS "thumbnailUrl",
        ${regions.id} AS "regionId",
        ${regions.name}::text AS "regionName",
        ${regions.slug}::text AS "regionSlug",
        ${distanceSql} AS "distanceMeters",
        "rec_ratings"."raw_rating" AS "ratingAverage",
        COALESCE("rec_ratings"."review_count", 0)::integer AS "ratingCount",
        ${touristPlaces.createdAt} AS "newestValue"
      FROM ${touristPlaces}
      INNER JOIN ${regions} ON ${regions.id} = ${touristPlaces.regionId}
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(rating::numeric), 2)::double precision AS "raw_rating",
          COUNT(id)::integer AS "review_count"
        FROM ${reviews}
        WHERE owner_type = 'PLACE'::public.owner_type
          AND owner_id = ${touristPlaces.id}
          AND status = 'APPROVED'::public.review_status
          AND deleted_at IS NULL
      ) AS "rec_ratings" ON true
      ${includeOrigin ? sql`CROSS JOIN "origin"` : sql.empty()}
      WHERE ${touristPlaces.status} = 'active'
        AND ${touristPlaces.deletedAt} IS NULL
        AND ${regions.deletedAt} IS NULL
    `;
  }

  private buildBusinessSelect(distanceSql: SQL, includeOrigin = false): SQL {
    return sql`
      SELECT
        'BUSINESS'::text AS "entityType",
        3::integer AS "entityOrder",
        ${businesses.id} AS "id",
        ${businesses.name}::text AS "name",
        ${businesses.slug}::text AS "slug",
        ${businesses.coverUrl}::text AS "thumbnailUrl",
        ${regions.id} AS "regionId",
        ${regions.name}::text AS "regionName",
        ${regions.slug}::text AS "regionSlug",
        ${distanceSql} AS "distanceMeters",
        "rec_ratings"."raw_rating" AS "ratingAverage",
        COALESCE("rec_ratings"."review_count", 0)::integer AS "ratingCount",
        ${businesses.createdAt} AS "newestValue"
      FROM ${businesses}
      INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
      INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(rating::numeric), 2)::double precision AS "raw_rating",
          COUNT(id)::integer AS "review_count"
        FROM ${reviews}
        WHERE owner_type = 'BUSINESS'::public.owner_type
          AND owner_id = ${businesses.id}
          AND status = 'APPROVED'::public.review_status
          AND deleted_at IS NULL
      ) AS "rec_ratings" ON true
      ${includeOrigin ? sql`CROSS JOIN "origin"` : sql.empty()}
      WHERE ${businesses.status} = 'active'
        AND ${businesses.deletedAt} IS NULL
        AND ${regions.deletedAt} IS NULL
        AND ${businessTypes.isActive} = TRUE
    `;
  }

  private buildAttractionSelect(distanceSql: SQL, includeOrigin = false): SQL {
    return sql`
      SELECT
        'ATTRACTION'::text AS "entityType",
        4::integer AS "entityOrder",
        ${attractions.id} AS "id",
        ${attractions.name}::text AS "name",
        ${attractions.slug}::text AS "slug",
        ${attractions.coverUrl}::text AS "thumbnailUrl",
        ${regions.id} AS "regionId",
        ${regions.name}::text AS "regionName",
        ${regions.slug}::text AS "regionSlug",
        ${distanceSql} AS "distanceMeters",
        "rec_ratings"."raw_rating" AS "ratingAverage",
        COALESCE("rec_ratings"."review_count", 0)::integer AS "ratingCount",
        ${attractions.createdAt} AS "newestValue"
      FROM ${attractions}
      INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
      LEFT JOIN LATERAL (
        SELECT
          ROUND(AVG(rating::numeric), 2)::double precision AS "raw_rating",
          COUNT(id)::integer AS "review_count"
        FROM ${reviews}
        WHERE owner_type = 'ATTRACTION'::public.owner_type
          AND owner_id = ${attractions.id}
          AND status = 'APPROVED'::public.review_status
          AND deleted_at IS NULL
      ) AS "rec_ratings" ON true
      ${includeOrigin ? sql`CROSS JOIN "origin"` : sql.empty()}
      WHERE ${attractions.status} = 'active'
        AND ${attractions.deletedAt} IS NULL
        AND ${regions.deletedAt} IS NULL
    `;
  }
}
