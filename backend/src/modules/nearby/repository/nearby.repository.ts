import type { Database } from '@/lib/database/client';
import {
  attractionCategories,
  attractions,
  businessTypes,
  businesses,
  regions,
  reviews,
  touristPlaces,
} from '@/lib/database/schema';
import { type SQL, sql } from 'drizzle-orm';
import type { NearbyEntityType, NearbyResultProjection } from './nearby-projection';
import {
  NearbyRepositoryInvariantError,
  NearbyRepositoryOperationError,
} from './nearby-repository.errors';
import type {
  INearbyRepository,
  NearbyBusinessTypeReferenceStatus,
  NearbyCategoryReferenceStatus,
  NearbyReferenceFilter,
  NearbyReferenceValidation,
  NearbyRegionReferenceStatus,
  NearbyRepositoryPage,
  NearbySearchCriteria,
} from './nearby-repository.interface';

interface NearbyRawRow extends Record<string, unknown> {
  entityType: string;
  entityTypeRank: number;
  entityId: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  rawDistanceMeters: string;
  distanceMeters: number;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  thumbnailUrl: string | null;
  averageRating: string | null;
  reviewCount: number;
}

export class DrizzleNearbyRepository implements INearbyRepository {
  constructor(private readonly database: Database) {}

  async searchNearby(criteria: NearbySearchCriteria): Promise<NearbyRepositoryPage> {
    if (criteria.entityTypes.length === 0) {
      return { items: [] };
    }

    try {
      // 1. Build CTE for Origin point
      const originCte = sql`
        "origin" AS (
          SELECT ST_SetSRID(ST_MakePoint(${criteria.longitude}, ${criteria.latitude}), 4326)::geography AS "point"
        )
      `;

      // 3. Build each entity branch SQL
      const branches: SQL[] = [];
      for (const type of criteria.entityTypes) {
        if (type === 'TOURIST_PLACE') {
          branches.push(this.buildTouristPlaceBranch(criteria));
        } else if (type === 'ATTRACTION') {
          branches.push(this.buildAttractionBranch(criteria));
        } else if (type === 'BUSINESS') {
          branches.push(this.buildBusinessBranch(criteria));
        } else if (type === 'UTILITY') {
          branches.push(this.buildUtilityBranch(criteria));
        }
      }

      const unionSql = sql.join(branches, sql` UNION ALL `);

      // 4. Build Keyset condition
      const keysetCondition = this.buildKeysetCondition(criteria.after);
      const keysetWhere = keysetCondition ? sql`WHERE ${keysetCondition}` : sql.empty();

      // 5. Final unified query with limit + 1
      const finalSql = sql`
        WITH ${originCte}
        SELECT *
        FROM (${unionSql}) AS "candidates"
        ${keysetWhere}
        ORDER BY "distanceMeters" ASC, "entityTypeRank" ASC, "entityId" ASC
        LIMIT ${criteria.limit + 1}::integer
      `;

      const rows = await this.database.execute<NearbyRawRow>(finalSql);
      const items = rows.map((row) => this.mapRowToProjection(row));

      return { items };
    } catch (error) {
      throw new NearbyRepositoryOperationError('searchNearby', error);
    }
  }

  async validateReferences(filters: NearbyReferenceFilter): Promise<NearbyReferenceValidation> {
    const region = filters.regionId
      ? sql`COALESCE(
          (
            SELECT CASE
              WHEN ${regions.deletedAt} IS NULL THEN 'valid'::text
              ELSE 'deleted'::text
            END
            FROM ${regions}
            WHERE ${regions.id} = ${filters.regionId}::uuid
          ),
          'missing'::text
        )`
      : sql`'not_requested'::text`;

    const attractionCategoryExists =
      filters.categoryId && filters.categoryType === 'attraction'
        ? sql`EXISTS (
          SELECT 1
          FROM ${attractionCategories}
          WHERE ${attractionCategories.id} = ${filters.categoryId}::uuid
        )`
        : sql`NULL::boolean`;

    const businessTypeStatus =
      filters.categoryId && filters.categoryType === 'business'
        ? sql`COALESCE(
          (
            SELECT CASE
              WHEN ${businessTypes.isActive} THEN 'valid'::text
              ELSE 'inactive'::text
            END
            FROM ${businessTypes}
            WHERE ${businessTypes.id} = ${filters.categoryId}::uuid
          ),
          'missing'::text
        )`
        : sql`'not_requested'::text`;

    const validationQuery = sql`
      SELECT
        ${region} AS "region",
        ${attractionCategoryExists} AS "categoryExists",
        ${businessTypeStatus} AS "businessType"
    `;

    try {
      const rows = await this.database.execute<{
        region: NearbyRegionReferenceStatus;
        categoryExists: boolean | null;
        businessType: NearbyBusinessTypeReferenceStatus;
      }>(validationQuery);
      const row = rows[0];
      if (!row) {
        throw new Error('Nearby reference validation returned no result');
      }

      const categoryStatus: NearbyCategoryReferenceStatus =
        filters.categoryId && filters.categoryType === 'attraction'
          ? row.categoryExists
            ? 'valid'
            : 'missing'
          : 'not_requested';

      return {
        region: row.region,
        category: categoryStatus,
        businessType: row.businessType,
      };
    } catch (error) {
      throw new NearbyRepositoryOperationError('validateReferences', error);
    }
  }

  private buildTouristPlaceBranch(criteria: NearbySearchCriteria): SQL {
    const conditions: SQL[] = [
      sql`${touristPlaces.status} = 'active'`,
      sql`${touristPlaces.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
      sql`ST_DWithin(${touristPlaces.location}, "origin"."point", ${criteria.radiusMeters}, true)`,
    ];

    if (criteria.regionId) {
      conditions.push(sql`${regions.id} = ${criteria.regionId}::uuid`);
    }

    if (criteria.categoryId) {
      // Tourist places do not have categories, so this branch yields nothing
      conditions.push(sql`FALSE`);
    }

    if (criteria.minRating) {
      const minRatingNum = Number(criteria.minRating);
      if (minRatingNum > 0) {
        conditions.push(sql`"nearby_ratings"."raw_rating" >= ${criteria.minRating}::numeric`);
      }
    }

    const whereClause = sql.join(conditions, sql` AND `);

    return sql`
      SELECT
        "sub"."entityType",
        "sub"."entityTypeRank",
        "sub"."entityId",
        "sub"."name",
        "sub"."slug",
        "sub"."latitude",
        "sub"."longitude",
        "sub"."distanceMeters"::text AS "rawDistanceMeters",
        "sub"."distanceMeters" AS "distanceMeters",
        "sub"."regionId",
        "sub"."regionName",
        "sub"."regionSlug",
        "sub"."thumbnailUrl",
        "sub"."averageRating",
        "sub"."reviewCount"
      FROM (
        SELECT
          'TOURIST_PLACE'::text AS "entityType",
          1::integer AS "entityTypeRank",
          ${touristPlaces.id} AS "entityId",
          ${touristPlaces.name}::text AS "name",
          ${touristPlaces.slug}::text AS "slug",
          ST_Y(${touristPlaces.location}::geometry)::double precision AS "latitude",
          ST_X(${touristPlaces.location}::geometry)::double precision AS "longitude",
          ST_Distance(${touristPlaces.location}, "origin"."point", true)::double precision AS "distanceMeters",
          ${regions.id} AS "regionId",
          ${regions.name}::text AS "regionName",
          ${regions.slug}::text AS "regionSlug",
          ${touristPlaces.coverUrl}::text AS "thumbnailUrl",
          "nearby_ratings"."raw_rating"::text AS "averageRating",
          COALESCE("nearby_ratings"."review_count", 0)::integer AS "reviewCount"
        FROM ${touristPlaces}
        INNER JOIN ${regions} ON ${regions.id} = ${touristPlaces.regionId}
        LEFT JOIN LATERAL (
          SELECT
            AVG(rating::numeric) AS "raw_rating",
            COUNT(id)::integer AS "review_count"
          FROM ${reviews}
          WHERE owner_type = 'PLACE'::public.owner_type
            AND owner_id = ${touristPlaces.id}
            AND status = 'APPROVED'::public.review_status
            AND deleted_at IS NULL
        ) AS "nearby_ratings" ON true
        CROSS JOIN "origin"
        WHERE ${whereClause}
      ) AS "sub"
    `;
  }

  private buildAttractionBranch(criteria: NearbySearchCriteria): SQL {
    const conditions: SQL[] = [
      sql`${attractions.status} = 'active'`,
      sql`${attractions.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
      sql`${attractionCategories.isUtility} = FALSE`,
      sql`ST_DWithin(${attractions.location}, "origin"."point", ${criteria.radiusMeters}, true)`,
    ];

    if (criteria.regionId) {
      conditions.push(sql`${regions.id} = ${criteria.regionId}::uuid`);
    }

    if (criteria.categoryId) {
      conditions.push(sql`${attractions.categoryId} = ${criteria.categoryId}::uuid`);
    }

    if (criteria.minRating) {
      const minRatingNum = Number(criteria.minRating);
      if (minRatingNum > 0) {
        conditions.push(sql`"nearby_ratings"."raw_rating" >= ${criteria.minRating}::numeric`);
      }
    }

    const whereClause = sql.join(conditions, sql` AND `);

    return sql`
      SELECT
        "sub"."entityType",
        "sub"."entityTypeRank",
        "sub"."entityId",
        "sub"."name",
        "sub"."slug",
        "sub"."latitude",
        "sub"."longitude",
        "sub"."distanceMeters"::text AS "rawDistanceMeters",
        "sub"."distanceMeters" AS "distanceMeters",
        "sub"."regionId",
        "sub"."regionName",
        "sub"."regionSlug",
        "sub"."thumbnailUrl",
        "sub"."averageRating",
        "sub"."reviewCount"
      FROM (
        SELECT
          'ATTRACTION'::text AS "entityType",
          2::integer AS "entityTypeRank",
          ${attractions.id} AS "entityId",
          ${attractions.name}::text AS "name",
          ${attractions.slug}::text AS "slug",
          ST_Y(${attractions.location}::geometry)::double precision AS "latitude",
          ST_X(${attractions.location}::geometry)::double precision AS "longitude",
          ST_Distance(${attractions.location}, "origin"."point", true)::double precision AS "distanceMeters",
          ${regions.id} AS "regionId",
          ${regions.name}::text AS "regionName",
          ${regions.slug}::text AS "regionSlug",
          ${attractions.coverUrl}::text AS "thumbnailUrl",
          "nearby_ratings"."raw_rating"::text AS "averageRating",
          COALESCE("nearby_ratings"."review_count", 0)::integer AS "reviewCount"
        FROM ${attractions}
        INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
        INNER JOIN ${attractionCategories} ON ${attractionCategories.id} = ${attractions.categoryId}
        LEFT JOIN LATERAL (
          SELECT
            AVG(rating::numeric) AS "raw_rating",
            COUNT(id)::integer AS "review_count"
          FROM ${reviews}
          WHERE owner_type = 'ATTRACTION'::public.owner_type
            AND owner_id = ${attractions.id}
            AND status = 'APPROVED'::public.review_status
            AND deleted_at IS NULL
        ) AS "nearby_ratings" ON true
        CROSS JOIN "origin"
        WHERE ${whereClause}
      ) AS "sub"
    `;
  }

  private buildBusinessBranch(criteria: NearbySearchCriteria): SQL {
    const conditions: SQL[] = [
      sql`${businesses.status} = 'active'`,
      sql`${businesses.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
      sql`${businessTypes.isActive} = TRUE`,
      sql`ST_DWithin(${businesses.location}, "origin"."point", ${criteria.radiusMeters}, true)`,
    ];

    if (criteria.regionId) {
      conditions.push(sql`${regions.id} = ${criteria.regionId}::uuid`);
    }

    if (criteria.categoryId) {
      conditions.push(sql`${businesses.businessTypeId} = ${criteria.categoryId}::uuid`);
    }

    if (criteria.minRating) {
      const minRatingNum = Number(criteria.minRating);
      if (minRatingNum > 0) {
        conditions.push(sql`"nearby_ratings"."raw_rating" >= ${criteria.minRating}::numeric`);
      }
    }

    const whereClause = sql.join(conditions, sql` AND `);

    return sql`
      SELECT
        "sub"."entityType",
        "sub"."entityTypeRank",
        "sub"."entityId",
        "sub"."name",
        "sub"."slug",
        "sub"."latitude",
        "sub"."longitude",
        "sub"."distanceMeters"::text AS "rawDistanceMeters",
        "sub"."distanceMeters" AS "distanceMeters",
        "sub"."regionId",
        "sub"."regionName",
        "sub"."regionSlug",
        "sub"."thumbnailUrl",
        "sub"."averageRating",
        "sub"."reviewCount"
      FROM (
        SELECT
          'BUSINESS'::text AS "entityType",
          3::integer AS "entityTypeRank",
          ${businesses.id} AS "entityId",
          ${businesses.name}::text AS "name",
          ${businesses.slug}::text AS "slug",
          ST_Y(${businesses.location}::geometry)::double precision AS "latitude",
          ST_X(${businesses.location}::geometry)::double precision AS "longitude",
          ST_Distance(${businesses.location}, "origin"."point", true)::double precision AS "distanceMeters",
          ${regions.id} AS "regionId",
          ${regions.name}::text AS "regionName",
          ${regions.slug}::text AS "regionSlug",
          ${businesses.coverUrl}::text AS "thumbnailUrl",
          "nearby_ratings"."raw_rating"::text AS "averageRating",
          COALESCE("nearby_ratings"."review_count", 0)::integer AS "reviewCount"
        FROM ${businesses}
        INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
        INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
        LEFT JOIN LATERAL (
          SELECT
            AVG(rating::numeric) AS "raw_rating",
            COUNT(id)::integer AS "review_count"
          FROM ${reviews}
          WHERE owner_type = 'BUSINESS'::public.owner_type
            AND owner_id = ${businesses.id}
            AND status = 'APPROVED'::public.review_status
            AND deleted_at IS NULL
        ) AS "nearby_ratings" ON true
        CROSS JOIN "origin"
        WHERE ${whereClause}
      ) AS "sub"
    `;
  }

  private buildUtilityBranch(criteria: NearbySearchCriteria): SQL {
    const conditions: SQL[] = [
      sql`${attractions.status} = 'active'`,
      sql`${attractions.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
      sql`${attractionCategories.isUtility} = TRUE`,
      sql`ST_DWithin(${attractions.location}, "origin"."point", ${criteria.radiusMeters}, true)`,
    ];

    if (criteria.regionId) {
      conditions.push(sql`${regions.id} = ${criteria.regionId}::uuid`);
    }

    if (criteria.categoryId) {
      conditions.push(sql`${attractions.categoryId} = ${criteria.categoryId}::uuid`);
    }

    if (criteria.minRating) {
      const minRatingNum = Number(criteria.minRating);
      if (minRatingNum > 0) {
        conditions.push(sql`"nearby_ratings"."raw_rating" >= ${criteria.minRating}::numeric`);
      }
    }

    const whereClause = sql.join(conditions, sql` AND `);

    return sql`
      SELECT
        "sub"."entityType",
        "sub"."entityTypeRank",
        "sub"."entityId",
        "sub"."name",
        "sub"."slug",
        "sub"."latitude",
        "sub"."longitude",
        "sub"."distanceMeters"::text AS "rawDistanceMeters",
        "sub"."distanceMeters" AS "distanceMeters",
        "sub"."regionId",
        "sub"."regionName",
        "sub"."regionSlug",
        "sub"."thumbnailUrl",
        "sub"."averageRating",
        "sub"."reviewCount"
      FROM (
        SELECT
          'UTILITY'::text AS "entityType",
          4::integer AS "entityTypeRank",
          ${attractions.id} AS "entityId",
          ${attractions.name}::text AS "name",
          ${attractions.slug}::text AS "slug",
          ST_Y(${attractions.location}::geometry)::double precision AS "latitude",
          ST_X(${attractions.location}::geometry)::double precision AS "longitude",
          ST_Distance(${attractions.location}, "origin"."point", true)::double precision AS "distanceMeters",
          ${regions.id} AS "regionId",
          ${regions.name}::text AS "regionName",
          ${regions.slug}::text AS "regionSlug",
          ${attractions.coverUrl}::text AS "thumbnailUrl",
          "nearby_ratings"."raw_rating"::text AS "averageRating",
          COALESCE("nearby_ratings"."review_count", 0)::integer AS "reviewCount"
        FROM ${attractions}
        INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
        INNER JOIN ${attractionCategories} ON ${attractionCategories.id} = ${attractions.categoryId}
        LEFT JOIN LATERAL (
          SELECT
            AVG(rating::numeric) AS "raw_rating",
            COUNT(id)::integer AS "review_count"
          FROM ${reviews}
          WHERE owner_type = 'ATTRACTION'::public.owner_type
            AND owner_id = ${attractions.id}
            AND status = 'APPROVED'::public.review_status
            AND deleted_at IS NULL
        ) AS "nearby_ratings" ON true
        CROSS JOIN "origin"
        WHERE ${whereClause}
      ) AS "sub"
    `;
  }

  private buildKeysetCondition(after: NearbySearchCriteria['after']): SQL | null {
    if (!after) return null;

    // Standard OR comparison logic for global stable ordering (distanceMeters ASC, entityTypeRank ASC, entityId ASC)
    return sql`(
      "distanceMeters" > ${after.rawDistanceMeters}::double precision
      OR (
        "distanceMeters" = ${after.rawDistanceMeters}::double precision
        AND "entityTypeRank" > ${after.entityTypeRank}::integer
      )
      OR (
        "distanceMeters" = ${after.rawDistanceMeters}::double precision
        AND "entityTypeRank" = ${after.entityTypeRank}::integer
        AND "entityId" > ${after.entityId}::uuid
      )
    )`;
  }

  private mapRowToProjection(row: NearbyRawRow): NearbyResultProjection {
    if (!row.entityType) {
      throw new NearbyRepositoryInvariantError('Raw nearby search row is missing entityType');
    }
    if (!row.entityId) {
      throw new NearbyRepositoryInvariantError('Raw nearby search row is missing entityId');
    }

    return {
      entityType: row.entityType as NearbyEntityType,
      entityTypeRank: Number(row.entityTypeRank),
      entityId: row.entityId,
      name: row.name,
      slug: row.slug,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      rawDistanceMeters: String(row.rawDistanceMeters),
      displayDistanceMeters: Number(row.rawDistanceMeters),
      regionId: row.regionId,
      regionName: row.regionName,
      regionSlug: row.regionSlug,
      thumbnailUrl: row.thumbnailUrl,
      averageRating: row.averageRating === null ? null : String(row.averageRating),
      reviewCount: Number(row.reviewCount),
    };
  }
}
