import {
  amenities,
  articleCategories,
  articles,
  attractionCategories,
  attractions,
  businessAmenities,
  businessTypes,
  businesses,
  regions,
  touristPlaces,
} from '@/lib/database/schema';
import { type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  SEARCH_ENTITY_ORDER,
  SEARCH_ENTITY_TYPES,
  type SearchEntityType,
  type SearchKeyset,
  type SearchReferenceFilter,
  type SearchRepositoryQuery,
} from './search-read-model';

const articleCategory = alias(articleCategories, 'search_article_category');
const attractionCategory = alias(attractionCategories, 'search_attraction_category');
const businessType = alias(businessTypes, 'search_business_type');
const placeRegion = alias(regions, 'search_place_region');
const businessRegion = alias(regions, 'search_business_region');
const attractionRegion = alias(regions, 'search_attraction_region');

/** Canonical query-side expressions. Keep structurally aligned with the Step 4.1.2 manifest. */
export const SEARCH_ARTICLE_FTS_DOCUMENT = sql`
  (
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${articles.title}::text, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${articles.slug}::text, '')),
      'B'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${articles.excerpt}::text, '')),
      'B'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${articles.content}::text, '')),
      'D'
    )
  )
`;

export const SEARCH_PLACE_FTS_DOCUMENT = sql`
  (
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${touristPlaces.name}::text, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${touristPlaces.slug}::text, '')),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'public.hsp_vietnamese'::regconfig,
        COALESCE(${touristPlaces.description}::text, '')
      ),
      'C'
    )
  )
`;

export const SEARCH_BUSINESS_FTS_DOCUMENT = sql`
  (
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${businesses.name}::text, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${businesses.slug}::text, '')),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'public.hsp_vietnamese'::regconfig,
        COALESCE(${businesses.description}::text, '')
      ),
      'C'
    )
  )
`;

export const SEARCH_ATTRACTION_FTS_DOCUMENT = sql`
  (
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${attractions.name}::text, '')),
      'A'
    ) ||
    setweight(
      to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(${attractions.slug}::text, '')),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'public.hsp_vietnamese'::regconfig,
        COALESCE(${attractions.description}::text, '')
      ),
      'C'
    )
  )
`;

export type SearchFtsDocumentStorage = 'expression' | 'stored';

export type SearchBoundedCandidateStrategy = 'global_ts_rank' | 'per_entity_canonical';

export interface SearchBoundedRankingOptions {
  /** Server-owned benchmark bound. It is never sourced from the public request. */
  readonly candidateLimit: number;
  readonly candidateStrategy?: SearchBoundedCandidateStrategy;
}

type SearchRankingStrategy =
  | { readonly mode: 'exact' }
  | {
      readonly mode: 'bounded';
      readonly candidateLimit: number;
      readonly candidateStrategy: SearchBoundedCandidateStrategy;
    };

const EXACT_RANKING: SearchRankingStrategy = { mode: 'exact' };

const SEARCH_ARTICLE_STORED_FTS_DOCUMENT = sql`${articles}.${sql.identifier('search_vector')}`;
const SEARCH_PLACE_STORED_FTS_DOCUMENT = sql`${touristPlaces}.${sql.identifier('search_vector')}`;
const SEARCH_BUSINESS_STORED_FTS_DOCUMENT = sql`${businesses}.${sql.identifier('search_vector')}`;
const SEARCH_ATTRACTION_STORED_FTS_DOCUMENT = sql`${attractions}.${sql.identifier('search_vector')}`;

function selectFtsDocument(expression: SQL, stored: SQL, storage: SearchFtsDocumentStorage): SQL {
  return storage === 'stored' ? stored : expression;
}

export function buildSearchQueryInspectionSql(q: string): SQL {
  return sql`
    SELECT
      numnode(
        websearch_to_tsquery('public.hsp_vietnamese'::regconfig, ${q})
      )::integer AS "lexemeCount"
  `;
}

function buildRequestedAmenitiesValues(amenityIds: readonly string[]): SQL {
  return sql.join(
    amenityIds.map((amenityId, ordinal) => sql`(${amenityId}::uuid, ${ordinal}::integer)`),
    sql`, `
  );
}

export function buildReferenceValidationSql(filters: SearchReferenceFilter): SQL {
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

  const articleCategoryExists = filters.articleCategoryId
    ? sql`EXISTS (
        SELECT 1
        FROM ${articleCategories}
        WHERE ${articleCategories.id} = ${filters.articleCategoryId}::uuid
      )`
    : sql`NULL::boolean`;

  const attractionCategoryExists = filters.attractionCategoryId
    ? sql`EXISTS (
        SELECT 1
        FROM ${attractionCategories}
        WHERE ${attractionCategories.id} = ${filters.attractionCategoryId}::uuid
      )`
    : sql`NULL::boolean`;

  const businessTypeStatus = filters.businessTypeId
    ? sql`COALESCE(
        (
          SELECT CASE
            WHEN ${businessTypes.isActive} THEN 'valid'::text
            ELSE 'inactive'::text
          END
          FROM ${businessTypes}
          WHERE ${businessTypes.id} = ${filters.businessTypeId}::uuid
        ),
        'missing'::text
      )`
    : sql`'not_requested'::text`;

  const baseProjection = sql`
    ${region} AS "region",
    ${articleCategoryExists} AS "articleCategoryExists",
    ${attractionCategoryExists} AS "attractionCategoryExists",
    ${businessTypeStatus} AS "businessType"
  `;

  if (filters.amenityIds.length === 0) {
    return sql`
      SELECT
        ${baseProjection},
        ARRAY[]::uuid[] AS "foundAmenityIds",
        ARRAY[]::uuid[] AS "missingAmenityIds"
    `;
  }

  return sql`
    WITH "requested_amenities"("id", "ordinal") AS (
      VALUES ${buildRequestedAmenitiesValues(filters.amenityIds)}
    )
    SELECT
      ${baseProjection},
      ARRAY(
        SELECT "requested_amenities"."id"
        FROM "requested_amenities"
        INNER JOIN ${amenities}
          ON ${amenities.id} = "requested_amenities"."id"
        ORDER BY "requested_amenities"."ordinal"
      ) AS "foundAmenityIds",
      ARRAY(
        SELECT "requested_amenities"."id"
        FROM "requested_amenities"
        LEFT JOIN ${amenities}
          ON ${amenities.id} = "requested_amenities"."id"
        WHERE ${amenities.id} IS NULL
        ORDER BY "requested_amenities"."ordinal"
      ) AS "missingAmenityIds"
  `;
}

export function getEligibleSearchEntityTypes(
  query: SearchRepositoryQuery
): readonly SearchEntityType[] {
  return SEARCH_ENTITY_TYPES.filter((entityType) => {
    if (!query.types.includes(entityType)) return false;
    if (query.regionId && entityType === 'article') return false;
    if (query.articleCategoryId && entityType !== 'article') return false;
    if (query.attractionCategoryId && entityType !== 'attraction') return false;
    if (query.businessTypeId && entityType !== 'business') return false;
    if ((query.priceMin || query.priceMax) && entityType !== 'business') return false;
    if (query.amenityIds.length > 0 && entityType !== 'business') return false;
    return true;
  });
}

function buildSearchInputCte(q: string | null): SQL {
  return q !== null
    ? sql`"search_input" AS (
        SELECT websearch_to_tsquery(
          'public.hsp_vietnamese'::regconfig,
          ${q}
        ) AS "query"
      )`
    : sql`"search_input" AS (SELECT NULL::tsquery AS "query")`;
}

function buildRatingsCte(): SQL {
  return sql`"search_ratings" AS (
    SELECT
      ${sql.identifier('owner_type')}::text AS "owner_type",
      ${sql.identifier('owner_id')} AS "owner_id",
      AVG(${sql.identifier('rating')}::numeric) AS "raw_rating"
    FROM ${sql.identifier('reviews')}
    WHERE ${sql.identifier('status')} = 'APPROVED'::public.review_status
      AND ${sql.identifier('deleted_at')} IS NULL
    GROUP BY ${sql.identifier('owner_type')}, ${sql.identifier('owner_id')}
  )`;
}

function requiresGlobalRatings(query: SearchRepositoryQuery): boolean {
  return query.sort === 'rating' || query.minRating !== null;
}

function buildRatingValue(query: SearchRepositoryQuery): SQL {
  return requiresGlobalRatings(query)
    ? sql`ROUND("search_ratings"."raw_rating", 2)`
    : sql`NULL::numeric`;
}

function buildRawRatingValue(query: SearchRepositoryQuery): SQL {
  return requiresGlobalRatings(query) ? sql`"search_ratings"."raw_rating"` : sql`NULL::numeric`;
}

function buildRatingsJoin(query: SearchRepositoryQuery, ownerType: string, ownerId: SQL): SQL {
  return requiresGlobalRatings(query)
    ? sql`LEFT JOIN "search_ratings"
        ON "search_ratings"."owner_type" = ${ownerType}
        AND "search_ratings"."owner_id" = ${ownerId}`
    : sql.empty();
}

function buildSelectedRegionCte(regionId: string): SQL {
  return sql`"search_selected_region" AS (
    SELECT ${regions.id} AS "id", ${regions.path} AS "path"
    FROM ${regions}
    WHERE ${regions.id} = ${regionId}::uuid
      AND ${regions.deletedAt} IS NULL
  )`;
}

function buildAmenityMatchesCte(amenityIds: readonly string[]): SQL {
  const amenityIdList = sql.join(
    amenityIds.map((amenityId) => sql`${amenityId}::uuid`),
    sql`, `
  );

  return sql`"search_amenity_matches" AS (
    SELECT ${businessAmenities.businessId} AS "business_id"
    FROM ${businessAmenities}
    WHERE ${businessAmenities.amenityId} IN (${amenityIdList})
    GROUP BY ${businessAmenities.businessId}
    HAVING COUNT(DISTINCT ${businessAmenities.amenityId}) = ${amenityIds.length}::integer
  )`;
}

function buildRankingColumns(
  document: SQL,
  hasQuery: boolean,
  ranking: SearchRankingStrategy
): SQL {
  if (!hasQuery) return sql`NULL::real AS "relevance"`;
  if (ranking.mode === 'exact') {
    return sql`ts_rank_cd(${document}, "search_input"."query", 1) AS "relevance"`;
  }
  return ranking.candidateStrategy === 'global_ts_rank'
    ? sql`
        NULL::real AS "relevance",
        ${document} AS "searchDocument",
        ts_rank(${document}, "search_input"."query", 1) AS "proxyRank"
      `
    : sql`
        NULL::real AS "relevance",
        ${document} AS "searchDocument"
      `;
}

function buildFtsCondition(document: SQL, hasQuery: boolean): SQL | null {
  return hasQuery ? sql`${document} @@ "search_input"."query"` : null;
}

function buildMinimumRatingCondition(minRating: string | null): SQL | null {
  return minRating ? sql`"search_ratings"."raw_rating" >= ${minRating}::numeric` : null;
}

function joinConditions(conditions: SQL[]): SQL {
  return sql.join(conditions, sql` AND `);
}

function buildArticleBranch(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL {
  const document = selectFtsDocument(
    SEARCH_ARTICLE_FTS_DOCUMENT,
    SEARCH_ARTICLE_STORED_FTS_DOCUMENT,
    storage
  );
  const conditions: SQL[] = [
    sql`${articles.deletedAt} IS NULL`,
    sql`${articles.status} = 'published'::public.article_status`,
    sql`${articles.publishedAt} IS NOT NULL`,
    sql`${articles.publishedAt} <= CURRENT_TIMESTAMP`,
  ];
  if (query.articleCategoryId) {
    conditions.push(sql`${articles.categoryId} = ${query.articleCategoryId}::uuid`);
  }
  const ftsCondition = buildFtsCondition(document, query.q !== null);
  if (ftsCondition) conditions.push(ftsCondition);
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);

  return sql`
    SELECT
      'article'::text AS "entityType",
      1::integer AS "entityOrder",
      ${articles.id} AS "id",
      ${articles.title}::text AS "name",
      ${articles.slug}::text AS "slug",
      ${articles.excerpt}::text AS "summarySource",
      NULL::text AS "thumbnailCandidate",
      NULL::uuid AS "regionId",
      NULL::text AS "regionName",
      NULL::text AS "regionSlug",
      ${articleCategory.id} AS "categoryId",
      ${articleCategory.code}::text AS "categoryCode",
      ${articleCategory.name}::text AS "categoryName",
      ${buildRatingValue(query)} AS "rating",
      NULL::numeric AS "priceMin",
      NULL::numeric AS "priceMax",
      ${buildRankingColumns(document, query.q !== null, ranking)},
      ${articles.publishedAt} AS "newestValue",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${articles}
    INNER JOIN ${articleCategories} AS ${sql.identifier('search_article_category')}
      ON ${articleCategory.id} = ${articles.categoryId}
    ${buildRatingsJoin(query, 'ARTICLE', sql`${articles.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildRegionJoin(regionColumn: SQL, regionPath: SQL, includeDescendants: boolean): SQL {
  if (includeDescendants) {
    return sql`INNER JOIN "search_selected_region"
      ON ${regionPath} <@ "search_selected_region"."path"`;
  }
  return sql`INNER JOIN "search_selected_region"
    ON ${regionColumn} = "search_selected_region"."id"`;
}

function buildPlaceBranch(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL {
  const document = selectFtsDocument(
    SEARCH_PLACE_FTS_DOCUMENT,
    SEARCH_PLACE_STORED_FTS_DOCUMENT,
    storage
  );
  const conditions: SQL[] = [
    sql`${touristPlaces.deletedAt} IS NULL`,
    sql`${touristPlaces.status} = 'active'`,
    sql`${placeRegion.deletedAt} IS NULL`,
  ];
  const ftsCondition = buildFtsCondition(document, query.q !== null);
  if (ftsCondition) conditions.push(ftsCondition);
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);

  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${touristPlaces.regionId}`,
        sql`${placeRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();

  return sql`
    SELECT
      'place'::text AS "entityType",
      4::integer AS "entityOrder",
      ${touristPlaces.id} AS "id",
      ${touristPlaces.name}::text AS "name",
      ${touristPlaces.slug}::text AS "slug",
      ${touristPlaces.description}::text AS "summarySource",
      ${touristPlaces.coverUrl}::text AS "thumbnailCandidate",
      ${placeRegion.id} AS "regionId",
      ${placeRegion.name}::text AS "regionName",
      ${placeRegion.slug}::text AS "regionSlug",
      NULL::uuid AS "categoryId",
      NULL::text AS "categoryCode",
      NULL::text AS "categoryName",
      ${buildRatingValue(query)} AS "rating",
      NULL::numeric AS "priceMin",
      NULL::numeric AS "priceMax",
      ${buildRankingColumns(document, query.q !== null, ranking)},
      ${touristPlaces.createdAt} AS "newestValue",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${touristPlaces}
    INNER JOIN ${regions} AS ${sql.identifier('search_place_region')}
      ON ${placeRegion.id} = ${touristPlaces.regionId}
    ${selectedRegionJoin}
    ${buildRatingsJoin(query, 'PLACE', sql`${touristPlaces.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildBusinessBranch(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL {
  const document = selectFtsDocument(
    SEARCH_BUSINESS_FTS_DOCUMENT,
    SEARCH_BUSINESS_STORED_FTS_DOCUMENT,
    storage
  );
  const conditions: SQL[] = [
    sql`${businesses.deletedAt} IS NULL`,
    sql`${businesses.status} = 'active'`,
    sql`${businessRegion.deletedAt} IS NULL`,
    sql`${businessType.isActive} = TRUE`,
  ];
  if (query.businessTypeId) {
    conditions.push(sql`${businesses.businessTypeId} = ${query.businessTypeId}::uuid`);
  }
  if (query.priceMin) {
    conditions.push(sql`${businesses.priceMax} >= ${query.priceMin}::numeric`);
  }
  if (query.priceMax) {
    conditions.push(sql`${businesses.priceMin} <= ${query.priceMax}::numeric`);
  }
  const ftsCondition = buildFtsCondition(document, query.q !== null);
  if (ftsCondition) conditions.push(ftsCondition);
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);

  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${businesses.regionId}`,
        sql`${businessRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();
  const amenityJoin =
    query.amenityIds.length > 0
      ? sql`INNER JOIN "search_amenity_matches"
          ON "search_amenity_matches"."business_id" = ${businesses.id}`
      : sql.empty();

  return sql`
    SELECT
      'business'::text AS "entityType",
      3::integer AS "entityOrder",
      ${businesses.id} AS "id",
      ${businesses.name}::text AS "name",
      ${businesses.slug}::text AS "slug",
      ${businesses.description}::text AS "summarySource",
      ${businesses.coverUrl}::text AS "thumbnailCandidate",
      ${businessRegion.id} AS "regionId",
      ${businessRegion.name}::text AS "regionName",
      ${businessRegion.slug}::text AS "regionSlug",
      ${businessType.id} AS "categoryId",
      ${businessType.code}::text AS "categoryCode",
      ${businessType.name}::text AS "categoryName",
      ${buildRatingValue(query)} AS "rating",
      ${businesses.priceMin} AS "priceMin",
      ${businesses.priceMax} AS "priceMax",
      ${buildRankingColumns(document, query.q !== null, ranking)},
      ${businesses.createdAt} AS "newestValue",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${businesses}
    INNER JOIN ${regions} AS ${sql.identifier('search_business_region')}
      ON ${businessRegion.id} = ${businesses.regionId}
    INNER JOIN ${businessTypes} AS ${sql.identifier('search_business_type')}
      ON ${businessType.id} = ${businesses.businessTypeId}
    ${selectedRegionJoin}
    ${amenityJoin}
    ${buildRatingsJoin(query, 'BUSINESS', sql`${businesses.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildAttractionBranch(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL {
  const document = selectFtsDocument(
    SEARCH_ATTRACTION_FTS_DOCUMENT,
    SEARCH_ATTRACTION_STORED_FTS_DOCUMENT,
    storage
  );
  const conditions: SQL[] = [
    sql`${attractions.deletedAt} IS NULL`,
    sql`${attractions.status} = 'active'`,
    sql`${attractionRegion.deletedAt} IS NULL`,
  ];
  if (query.attractionCategoryId) {
    conditions.push(sql`${attractions.categoryId} = ${query.attractionCategoryId}::uuid`);
  }
  const ftsCondition = buildFtsCondition(document, query.q !== null);
  if (ftsCondition) conditions.push(ftsCondition);
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);

  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${attractions.regionId}`,
        sql`${attractionRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();

  return sql`
    SELECT
      'attraction'::text AS "entityType",
      2::integer AS "entityOrder",
      ${attractions.id} AS "id",
      ${attractions.name}::text AS "name",
      ${attractions.slug}::text AS "slug",
      ${attractions.description}::text AS "summarySource",
      ${attractions.coverUrl}::text AS "thumbnailCandidate",
      ${attractionRegion.id} AS "regionId",
      ${attractionRegion.name}::text AS "regionName",
      ${attractionRegion.slug}::text AS "regionSlug",
      ${attractionCategory.id} AS "categoryId",
      ${attractionCategory.code}::text AS "categoryCode",
      ${attractionCategory.name}::text AS "categoryName",
      ${buildRatingValue(query)} AS "rating",
      NULL::numeric AS "priceMin",
      NULL::numeric AS "priceMax",
      ${buildRankingColumns(document, query.q !== null, ranking)},
      ${attractions.createdAt} AS "newestValue",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${attractions}
    INNER JOIN ${regions} AS ${sql.identifier('search_attraction_region')}
      ON ${attractionRegion.id} = ${attractions.regionId}
    INNER JOIN ${attractionCategories} AS ${sql.identifier('search_attraction_category')}
      ON ${attractionCategory.id} = ${attractions.categoryId}
    ${selectedRegionJoin}
    ${buildRatingsJoin(query, 'ATTRACTION', sql`${attractions.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildBranch(
  entityType: SearchEntityType,
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL {
  switch (entityType) {
    case 'article':
      return buildArticleBranch(query, storage, ranking);
    case 'attraction':
      return buildAttractionBranch(query, storage, ranking);
    case 'business':
      return buildBusinessBranch(query, storage, ranking);
    case 'place':
      return buildPlaceBranch(query, storage, ranking);
  }
}

function buildTieBreakerAfter(keyset: SearchKeyset): SQL {
  const entityOrder = SEARCH_ENTITY_ORDER[keyset.entityType];
  return sql`(
    "entityOrder" > ${entityOrder}::integer
    OR (
      "entityOrder" = ${entityOrder}::integer
      AND "id" > ${keyset.id}::uuid
    )
  )`;
}

function buildKeysetCondition(keyset: SearchKeyset | null): SQL | null {
  if (!keyset) return null;

  const tieBreaker = buildTieBreakerAfter(keyset);
  switch (keyset.sort) {
    case 'relevance':
      return sql`(
        "relevance" < ${keyset.sortValue}::real
        OR ("relevance" = ${keyset.sortValue}::real AND ${tieBreaker})
      )`;
    case 'newest':
      if (keyset.sortValue === null) {
        return sql`("newestValue" IS NULL AND ${tieBreaker})`;
      }
      return sql`(
        "newestValue" IS NULL
        OR "newestValue" < ${keyset.sortValue}::timestamptz
        OR ("newestValue" = ${keyset.sortValue}::timestamptz AND ${tieBreaker})
      )`;
    case 'rating':
      if (keyset.sortValue === null) {
        return sql`("rawRating" IS NULL AND ${tieBreaker})`;
      }
      return sql`(
        "rawRating" IS NULL
        OR "rawRating" < ${keyset.sortValue}::numeric
        OR ("rawRating" = ${keyset.sortValue}::numeric AND ${tieBreaker})
      )`;
    case 'price_asc':
      if (keyset.sortValue === null) {
        return sql`("priceMin" IS NULL AND ${tieBreaker})`;
      }
      return sql`(
        "priceMin" IS NULL
        OR "priceMin" > ${keyset.sortValue}::numeric
        OR ("priceMin" = ${keyset.sortValue}::numeric AND ${tieBreaker})
      )`;
    case 'price_desc':
      if (keyset.sortValue === null) {
        return sql`("priceMax" IS NULL AND ${tieBreaker})`;
      }
      return sql`(
        "priceMax" IS NULL
        OR "priceMax" < ${keyset.sortValue}::numeric
        OR ("priceMax" = ${keyset.sortValue}::numeric AND ${tieBreaker})
      )`;
  }
}

function buildOrderBy(query: SearchRepositoryQuery): SQL {
  switch (query.sort) {
    case 'relevance':
      return sql`"relevance" DESC, "entityOrder" ASC, "id" ASC`;
    case 'newest':
      return sql`"newestValue" DESC NULLS LAST, "entityOrder" ASC, "id" ASC`;
    case 'rating':
      return sql`"rawRating" DESC NULLS LAST, "entityOrder" ASC, "id" ASC`;
    case 'price_asc':
      return sql`"priceMin" ASC NULLS LAST, "entityOrder" ASC, "id" ASC`;
    case 'price_desc':
      return sql`"priceMax" DESC NULLS LAST, "entityOrder" ASC, "id" ASC`;
  }
}

function buildPageRatingsCte(): SQL {
  return sql`"search_page_ratings" AS (
    SELECT
      "search_page"."entityType" AS "entity_type",
      "search_page"."id" AS "owner_id",
      AVG(${sql.identifier('reviews')}.${sql.identifier('rating')}::numeric) AS "raw_rating"
    FROM "search_page"
    INNER JOIN ${sql.identifier('reviews')}
      ON ${sql.identifier('reviews')}.${sql.identifier('owner_id')} = "search_page"."id"
      AND ${sql.identifier('reviews')}.${sql.identifier('owner_type')} = CASE
        WHEN "search_page"."entityType" = 'article' THEN 'ARTICLE'::public.owner_type
        WHEN "search_page"."entityType" = 'attraction' THEN 'ATTRACTION'::public.owner_type
        WHEN "search_page"."entityType" = 'business' THEN 'BUSINESS'::public.owner_type
        ELSE 'PLACE'::public.owner_type
      END
    WHERE ${sql.identifier('reviews')}.${sql.identifier('status')} = 'APPROVED'::public.review_status
      AND ${sql.identifier('reviews')}.${sql.identifier('deleted_at')} IS NULL
    GROUP BY "search_page"."entityType", "search_page"."id"
  )`;
}

function buildFinalProjection(query: SearchRepositoryQuery): SQL {
  const usesGlobalRatings = requiresGlobalRatings(query);
  const rating = usesGlobalRatings
    ? sql`"search_page"."rating"`
    : sql`ROUND("search_page_ratings"."raw_rating", 2)`;
  const rawRating = usesGlobalRatings
    ? sql`"search_page"."rawRating"`
    : sql`"search_page_ratings"."raw_rating"`;
  const ratingJoin = usesGlobalRatings
    ? sql.empty()
    : sql`LEFT JOIN "search_page_ratings"
        ON "search_page_ratings"."entity_type" = "search_page"."entityType"
        AND "search_page_ratings"."owner_id" = "search_page"."id"`;
  const priceCursorValue =
    query.sort === 'price_asc'
      ? sql`"search_page"."priceMin"::text`
      : query.sort === 'price_desc'
        ? sql`"search_page"."priceMax"::text`
        : sql`NULL::text`;

  return sql`
    SELECT
      "search_page"."entityType",
      "search_page"."entityOrder",
      "search_page"."id",
      "search_page"."name",
      "search_page"."slug",
      "search_page"."summarySource",
      "search_page"."thumbnailCandidate",
      "search_page"."regionId",
      "search_page"."regionName",
      "search_page"."regionSlug",
      "search_page"."categoryId",
      "search_page"."categoryCode",
      "search_page"."categoryName",
      ${rating} AS "rating",
      "search_page"."priceMin",
      "search_page"."priceMax",
      "search_page"."relevance",
      "search_page"."newestValue"::text AS "newestCursorValue",
      ${rawRating} AS "rawRating",
      ${priceCursorValue} AS "priceCursorValue"
    FROM "search_page"
    ${ratingJoin}
    ORDER BY ${buildOrderBy(query)}
  `;
}

function buildSearchCandidateCtes(branches: SQL[], ranking: SearchRankingStrategy): SQL[] {
  if (ranking.mode === 'exact') {
    return [sql`"search_candidates" AS (${sql.join(branches, sql` UNION ALL `)})`];
  }

  const boundedCandidates =
    ranking.candidateStrategy === 'global_ts_rank'
      ? [
          sql`"search_proxy_candidates" AS (${sql.join(branches, sql` UNION ALL `)})`,
          sql`"search_bounded_candidates" AS MATERIALIZED (
            SELECT *
            FROM "search_proxy_candidates"
            ORDER BY "proxyRank" DESC, "entityOrder" ASC, "id" ASC
            LIMIT ${ranking.candidateLimit}::integer
          )`,
        ]
      : [
          sql`"search_bounded_candidates" AS MATERIALIZED (
            ${sql.join(
              branches.map(
                (branch, index) => sql`(
                  SELECT *
                  FROM (${branch}) AS ${sql.identifier(`search_entity_candidates_${index + 1}`)}
                  ORDER BY "id" ASC
                  LIMIT ${ranking.candidateLimit}::integer
                )`
              ),
              sql` UNION ALL `
            )}
          )`,
        ];

  return [
    ...boundedCandidates,
    sql`"search_candidates" AS (
      SELECT
        "search_bounded_candidates"."entityType",
        "search_bounded_candidates"."entityOrder",
        "search_bounded_candidates"."id",
        "search_bounded_candidates"."name",
        "search_bounded_candidates"."slug",
        "search_bounded_candidates"."summarySource",
        "search_bounded_candidates"."thumbnailCandidate",
        "search_bounded_candidates"."regionId",
        "search_bounded_candidates"."regionName",
        "search_bounded_candidates"."regionSlug",
        "search_bounded_candidates"."categoryId",
        "search_bounded_candidates"."categoryCode",
        "search_bounded_candidates"."categoryName",
        "search_bounded_candidates"."rating",
        "search_bounded_candidates"."priceMin",
        "search_bounded_candidates"."priceMax",
        ts_rank_cd(
          "search_bounded_candidates"."searchDocument",
          "search_input"."query",
          1
        ) AS "relevance",
        "search_bounded_candidates"."newestValue",
        "search_bounded_candidates"."rawRating"
      FROM "search_bounded_candidates"
      CROSS JOIN "search_input"
    )`,
  ];
}

function buildSearchSql(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage,
  ranking: SearchRankingStrategy
): SQL | null {
  const eligibleTypes = getEligibleSearchEntityTypes(query);
  if (eligibleTypes.length === 0) return null;

  const ctes: SQL[] = [buildSearchInputCte(query.q)];
  if (requiresGlobalRatings(query)) ctes.push(buildRatingsCte());
  if (query.regionId) ctes.push(buildSelectedRegionCte(query.regionId));
  if (query.amenityIds.length > 0) ctes.push(buildAmenityMatchesCte(query.amenityIds));

  const branches = eligibleTypes.map((entityType) =>
    buildBranch(entityType, query, storage, ranking)
  );
  const candidateCtes = buildSearchCandidateCtes(branches, ranking);
  const keysetCondition = buildKeysetCondition(query.keyset);
  const keysetWhere = keysetCondition ? sql`WHERE ${keysetCondition}` : sql.empty();

  const searchPageCte = sql`"search_page" AS (
    SELECT *
    FROM "search_candidates"
    ${keysetWhere}
    ORDER BY ${buildOrderBy(query)}
    LIMIT ${query.limit + 1}::integer
  )`;
  const postCandidateCtes = requiresGlobalRatings(query)
    ? [searchPageCte]
    : [searchPageCte, buildPageRatingsCte()];

  return sql`
    WITH
      ${sql.join(ctes, sql`, `)},
      ${sql.join(candidateCtes, sql`, `)},
      ${sql.join(postCandidateCtes, sql`, `)}
    ${buildFinalProjection(query)}
  `;
}

export function buildUnifiedSearchSql(
  query: SearchRepositoryQuery,
  storage: SearchFtsDocumentStorage = 'expression'
): SQL | null {
  return buildSearchSql(query, storage, EXACT_RANKING);
}

/**
 * Benchmark-only Option B query. Production callers must continue using
 * `buildUnifiedSearchSql`; this function always uses the stored-vector prototype.
 */
export function buildBoundedSearchSql(
  query: SearchRepositoryQuery,
  options: SearchBoundedRankingOptions
): SQL | null {
  if (
    !Number.isInteger(options.candidateLimit) ||
    options.candidateLimit < 51 ||
    options.candidateLimit > 5_000
  ) {
    throw new Error('Bounded Search candidate limit must be an integer between 51 and 5000');
  }

  if (query.q === null || query.sort !== 'relevance') {
    return buildUnifiedSearchSql(query, 'stored');
  }

  return buildSearchSql(query, 'stored', {
    mode: 'bounded',
    candidateLimit: options.candidateLimit,
    candidateStrategy: options.candidateStrategy ?? 'per_entity_canonical',
  });
}

function buildPerEntityArticleCandidate(query: SearchRepositoryQuery): SQL {
  const conditions: SQL[] = [
    sql`${articles.deletedAt} IS NULL`,
    sql`${articles.status} = 'published'::public.article_status`,
    sql`${articles.publishedAt} IS NOT NULL`,
    sql`${articles.publishedAt} <= CURRENT_TIMESTAMP`,
    sql`${SEARCH_ARTICLE_STORED_FTS_DOCUMENT} @@ "search_input"."query"`,
  ];
  if (query.articleCategoryId) {
    conditions.push(sql`${articles.categoryId} = ${query.articleCategoryId}::uuid`);
  }
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);

  return sql`
    SELECT
      'article'::text AS "entityType",
      1::integer AS "entityOrder",
      ${articles.id} AS "id",
      ts_rank_cd(
        ${SEARCH_ARTICLE_STORED_FTS_DOCUMENT},
        "search_input"."query",
        1
      ) AS "relevance",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${articles}
    INNER JOIN ${articleCategories} AS ${sql.identifier('search_article_category')}
      ON ${articleCategory.id} = ${articles.categoryId}
    ${buildRatingsJoin(query, 'ARTICLE', sql`${articles.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildPerEntityPlaceCandidate(query: SearchRepositoryQuery): SQL {
  const conditions: SQL[] = [
    sql`${touristPlaces.deletedAt} IS NULL`,
    sql`${touristPlaces.status} = 'active'`,
    sql`${placeRegion.deletedAt} IS NULL`,
    sql`${SEARCH_PLACE_STORED_FTS_DOCUMENT} @@ "search_input"."query"`,
  ];
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);
  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${touristPlaces.regionId}`,
        sql`${placeRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();

  return sql`
    SELECT
      'place'::text AS "entityType",
      4::integer AS "entityOrder",
      ${touristPlaces.id} AS "id",
      ts_rank_cd(
        ${SEARCH_PLACE_STORED_FTS_DOCUMENT},
        "search_input"."query",
        1
      ) AS "relevance",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${touristPlaces}
    INNER JOIN ${regions} AS ${sql.identifier('search_place_region')}
      ON ${placeRegion.id} = ${touristPlaces.regionId}
    ${selectedRegionJoin}
    ${buildRatingsJoin(query, 'PLACE', sql`${touristPlaces.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildPerEntityBusinessCandidate(query: SearchRepositoryQuery): SQL {
  const conditions: SQL[] = [
    sql`${businesses.deletedAt} IS NULL`,
    sql`${businesses.status} = 'active'`,
    sql`${businessRegion.deletedAt} IS NULL`,
    sql`${businessType.isActive} = TRUE`,
    sql`${SEARCH_BUSINESS_STORED_FTS_DOCUMENT} @@ "search_input"."query"`,
  ];
  if (query.businessTypeId) {
    conditions.push(sql`${businesses.businessTypeId} = ${query.businessTypeId}::uuid`);
  }
  if (query.priceMin) {
    conditions.push(sql`${businesses.priceMax} >= ${query.priceMin}::numeric`);
  }
  if (query.priceMax) {
    conditions.push(sql`${businesses.priceMin} <= ${query.priceMax}::numeric`);
  }
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);
  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${businesses.regionId}`,
        sql`${businessRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();
  const amenityJoin =
    query.amenityIds.length > 0
      ? sql`INNER JOIN "search_amenity_matches"
          ON "search_amenity_matches"."business_id" = ${businesses.id}`
      : sql.empty();

  return sql`
    SELECT
      'business'::text AS "entityType",
      3::integer AS "entityOrder",
      ${businesses.id} AS "id",
      ts_rank_cd(
        ${SEARCH_BUSINESS_STORED_FTS_DOCUMENT},
        "search_input"."query",
        1
      ) AS "relevance",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${businesses}
    INNER JOIN ${regions} AS ${sql.identifier('search_business_region')}
      ON ${businessRegion.id} = ${businesses.regionId}
    INNER JOIN ${businessTypes} AS ${sql.identifier('search_business_type')}
      ON ${businessType.id} = ${businesses.businessTypeId}
    ${selectedRegionJoin}
    ${amenityJoin}
    ${buildRatingsJoin(query, 'BUSINESS', sql`${businesses.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildPerEntityAttractionCandidate(query: SearchRepositoryQuery): SQL {
  const conditions: SQL[] = [
    sql`${attractions.deletedAt} IS NULL`,
    sql`${attractions.status} = 'active'`,
    sql`${attractionRegion.deletedAt} IS NULL`,
    sql`${SEARCH_ATTRACTION_STORED_FTS_DOCUMENT} @@ "search_input"."query"`,
  ];
  if (query.attractionCategoryId) {
    conditions.push(sql`${attractions.categoryId} = ${query.attractionCategoryId}::uuid`);
  }
  const minimumRating = buildMinimumRatingCondition(query.minRating);
  if (minimumRating) conditions.push(minimumRating);
  const selectedRegionJoin = query.regionId
    ? buildRegionJoin(
        sql`${attractions.regionId}`,
        sql`${attractionRegion.path}`,
        query.includeDescendants
      )
    : sql.empty();

  return sql`
    SELECT
      'attraction'::text AS "entityType",
      2::integer AS "entityOrder",
      ${attractions.id} AS "id",
      ts_rank_cd(
        ${SEARCH_ATTRACTION_STORED_FTS_DOCUMENT},
        "search_input"."query",
        1
      ) AS "relevance",
      ${buildRawRatingValue(query)} AS "rawRating"
    FROM ${attractions}
    INNER JOIN ${regions} AS ${sql.identifier('search_attraction_region')}
      ON ${attractionRegion.id} = ${attractions.regionId}
    INNER JOIN ${attractionCategories} AS ${sql.identifier('search_attraction_category')}
      ON ${attractionCategory.id} = ${attractions.categoryId}
    ${selectedRegionJoin}
    ${buildRatingsJoin(query, 'ATTRACTION', sql`${attractions.id}`)}
    CROSS JOIN "search_input"
    WHERE ${joinConditions(conditions)}
  `;
}

function buildPerEntityCandidate(entityType: SearchEntityType, query: SearchRepositoryQuery): SQL {
  switch (entityType) {
    case 'article':
      return buildPerEntityArticleCandidate(query);
    case 'attraction':
      return buildPerEntityAttractionCandidate(query);
    case 'business':
      return buildPerEntityBusinessCandidate(query);
    case 'place':
      return buildPerEntityPlaceCandidate(query);
  }
}

function buildPerEntityRankedBranch(
  entityType: SearchEntityType,
  query: SearchRepositoryQuery
): SQL {
  const rankedAlias = sql.identifier(`search_${entityType}_ranked`);
  const keysetCondition = buildKeysetCondition(query.keyset);
  const keysetWhere = keysetCondition ? sql`WHERE ${keysetCondition}` : sql.empty();

  return sql`(
    SELECT
      ${rankedAlias}."entityType",
      ${rankedAlias}."entityOrder",
      ${rankedAlias}."id",
      ${rankedAlias}."relevance",
      ${rankedAlias}."rawRating"
    FROM (${buildPerEntityCandidate(entityType, query)}) AS ${rankedAlias}
    ${keysetWhere}
    ORDER BY ${buildOrderBy(query)}
    LIMIT ${query.limit + 1}::integer
  )`;
}

function buildPerEntityHydrationBranch(
  entityType: SearchEntityType,
  query: SearchRepositoryQuery
): SQL {
  const rating = requiresGlobalRatings(query)
    ? sql`ROUND("search_ranked_page"."rawRating", 2)`
    : sql`NULL::numeric`;

  switch (entityType) {
    case 'article':
      return sql`
        SELECT
          "search_ranked_page"."entityType",
          "search_ranked_page"."entityOrder",
          "search_ranked_page"."id",
          ${articles.title}::text AS "name",
          ${articles.slug}::text AS "slug",
          ${articles.excerpt}::text AS "summarySource",
          NULL::text AS "thumbnailCandidate",
          NULL::uuid AS "regionId",
          NULL::text AS "regionName",
          NULL::text AS "regionSlug",
          ${articleCategory.id} AS "categoryId",
          ${articleCategory.code}::text AS "categoryCode",
          ${articleCategory.name}::text AS "categoryName",
          ${rating} AS "rating",
          NULL::numeric AS "priceMin",
          NULL::numeric AS "priceMax",
          "search_ranked_page"."relevance",
          ${articles.publishedAt} AS "newestValue",
          "search_ranked_page"."rawRating"
        FROM "search_ranked_page"
        INNER JOIN ${articles}
          ON "search_ranked_page"."entityType" = 'article'
          AND ${articles.id} = "search_ranked_page"."id"
        INNER JOIN ${articleCategories} AS ${sql.identifier('search_article_category')}
          ON ${articleCategory.id} = ${articles.categoryId}
      `;
    case 'place':
      return sql`
        SELECT
          "search_ranked_page"."entityType",
          "search_ranked_page"."entityOrder",
          "search_ranked_page"."id",
          ${touristPlaces.name}::text AS "name",
          ${touristPlaces.slug}::text AS "slug",
          ${touristPlaces.description}::text AS "summarySource",
          ${touristPlaces.coverUrl}::text AS "thumbnailCandidate",
          ${placeRegion.id} AS "regionId",
          ${placeRegion.name}::text AS "regionName",
          ${placeRegion.slug}::text AS "regionSlug",
          NULL::uuid AS "categoryId",
          NULL::text AS "categoryCode",
          NULL::text AS "categoryName",
          ${rating} AS "rating",
          NULL::numeric AS "priceMin",
          NULL::numeric AS "priceMax",
          "search_ranked_page"."relevance",
          ${touristPlaces.createdAt} AS "newestValue",
          "search_ranked_page"."rawRating"
        FROM "search_ranked_page"
        INNER JOIN ${touristPlaces}
          ON "search_ranked_page"."entityType" = 'place'
          AND ${touristPlaces.id} = "search_ranked_page"."id"
        INNER JOIN ${regions} AS ${sql.identifier('search_place_region')}
          ON ${placeRegion.id} = ${touristPlaces.regionId}
      `;
    case 'business':
      return sql`
        SELECT
          "search_ranked_page"."entityType",
          "search_ranked_page"."entityOrder",
          "search_ranked_page"."id",
          ${businesses.name}::text AS "name",
          ${businesses.slug}::text AS "slug",
          ${businesses.description}::text AS "summarySource",
          ${businesses.coverUrl}::text AS "thumbnailCandidate",
          ${businessRegion.id} AS "regionId",
          ${businessRegion.name}::text AS "regionName",
          ${businessRegion.slug}::text AS "regionSlug",
          ${businessType.id} AS "categoryId",
          ${businessType.code}::text AS "categoryCode",
          ${businessType.name}::text AS "categoryName",
          ${rating} AS "rating",
          ${businesses.priceMin} AS "priceMin",
          ${businesses.priceMax} AS "priceMax",
          "search_ranked_page"."relevance",
          ${businesses.createdAt} AS "newestValue",
          "search_ranked_page"."rawRating"
        FROM "search_ranked_page"
        INNER JOIN ${businesses}
          ON "search_ranked_page"."entityType" = 'business'
          AND ${businesses.id} = "search_ranked_page"."id"
        INNER JOIN ${regions} AS ${sql.identifier('search_business_region')}
          ON ${businessRegion.id} = ${businesses.regionId}
        INNER JOIN ${businessTypes} AS ${sql.identifier('search_business_type')}
          ON ${businessType.id} = ${businesses.businessTypeId}
      `;
    case 'attraction':
      return sql`
        SELECT
          "search_ranked_page"."entityType",
          "search_ranked_page"."entityOrder",
          "search_ranked_page"."id",
          ${attractions.name}::text AS "name",
          ${attractions.slug}::text AS "slug",
          ${attractions.description}::text AS "summarySource",
          ${attractions.coverUrl}::text AS "thumbnailCandidate",
          ${attractionRegion.id} AS "regionId",
          ${attractionRegion.name}::text AS "regionName",
          ${attractionRegion.slug}::text AS "regionSlug",
          ${attractionCategory.id} AS "categoryId",
          ${attractionCategory.code}::text AS "categoryCode",
          ${attractionCategory.name}::text AS "categoryName",
          ${rating} AS "rating",
          NULL::numeric AS "priceMin",
          NULL::numeric AS "priceMax",
          "search_ranked_page"."relevance",
          ${attractions.createdAt} AS "newestValue",
          "search_ranked_page"."rawRating"
        FROM "search_ranked_page"
        INNER JOIN ${attractions}
          ON "search_ranked_page"."entityType" = 'attraction'
          AND ${attractions.id} = "search_ranked_page"."id"
        INNER JOIN ${regions} AS ${sql.identifier('search_attraction_region')}
          ON ${attractionRegion.id} = ${attractions.regionId}
        INNER JOIN ${attractionCategories} AS ${sql.identifier('search_attraction_category')}
          ON ${attractionCategory.id} = ${attractions.categoryId}
      `;
  }
}

function buildPerEntityPageRatingsCte(): SQL {
  return sql`"search_per_entity_page_ratings" AS (
    SELECT
      "search_ranked_page"."entityType" AS "entity_type",
      "search_ranked_page"."id" AS "owner_id",
      AVG(${sql.identifier('reviews')}.${sql.identifier('rating')}::numeric) AS "raw_rating"
    FROM "search_ranked_page"
    INNER JOIN ${sql.identifier('reviews')}
      ON ${sql.identifier('reviews')}.${sql.identifier('owner_id')} = "search_ranked_page"."id"
      AND ${sql.identifier('reviews')}.${sql.identifier('owner_type')} = CASE
        WHEN "search_ranked_page"."entityType" = 'article' THEN 'ARTICLE'::public.owner_type
        WHEN "search_ranked_page"."entityType" = 'attraction' THEN 'ATTRACTION'::public.owner_type
        WHEN "search_ranked_page"."entityType" = 'business' THEN 'BUSINESS'::public.owner_type
        ELSE 'PLACE'::public.owner_type
      END
    WHERE ${sql.identifier('reviews')}.${sql.identifier('status')} = 'APPROVED'::public.review_status
      AND ${sql.identifier('reviews')}.${sql.identifier('deleted_at')} IS NULL
    GROUP BY "search_ranked_page"."entityType", "search_ranked_page"."id"
  )`;
}

function buildPerEntityFinalProjection(query: SearchRepositoryQuery): SQL {
  const usesGlobalRatings = requiresGlobalRatings(query);
  const rating = usesGlobalRatings
    ? sql`"search_per_entity_hydrated"."rating"`
    : sql`ROUND("search_per_entity_page_ratings"."raw_rating", 2)`;
  const rawRating = usesGlobalRatings
    ? sql`"search_per_entity_hydrated"."rawRating"`
    : sql`"search_per_entity_page_ratings"."raw_rating"`;
  const ratingJoin = usesGlobalRatings
    ? sql.empty()
    : sql`LEFT JOIN "search_per_entity_page_ratings"
        ON "search_per_entity_page_ratings"."entity_type" = "search_per_entity_hydrated"."entityType"
        AND "search_per_entity_page_ratings"."owner_id" = "search_per_entity_hydrated"."id"`;

  return sql`
    SELECT
      "search_per_entity_hydrated"."entityType",
      "search_per_entity_hydrated"."entityOrder",
      "search_per_entity_hydrated"."id",
      "search_per_entity_hydrated"."name",
      "search_per_entity_hydrated"."slug",
      "search_per_entity_hydrated"."summarySource",
      "search_per_entity_hydrated"."thumbnailCandidate",
      "search_per_entity_hydrated"."regionId",
      "search_per_entity_hydrated"."regionName",
      "search_per_entity_hydrated"."regionSlug",
      "search_per_entity_hydrated"."categoryId",
      "search_per_entity_hydrated"."categoryCode",
      "search_per_entity_hydrated"."categoryName",
      ${rating} AS "rating",
      "search_per_entity_hydrated"."priceMin",
      "search_per_entity_hydrated"."priceMax",
      "search_per_entity_hydrated"."relevance",
      "search_per_entity_hydrated"."newestValue"::text AS "newestCursorValue",
      ${rawRating} AS "rawRating",
      NULL::text AS "priceCursorValue"
    FROM "search_per_entity_hydrated"
    ${ratingJoin}
    ORDER BY ${buildOrderBy(query)}
  `;
}

/**
 * Benchmark-only exact per-entity top-K merge with late hydration. Production callers must
 * continue using `buildUnifiedSearchSql` until this query shape passes its architecture gates.
 */
export function buildExactPerEntityTopKSearchSql(query: SearchRepositoryQuery): SQL | null {
  if (query.q === null || query.sort !== 'relevance') {
    return buildUnifiedSearchSql(query, 'stored');
  }

  const eligibleTypes = getEligibleSearchEntityTypes(query);
  if (eligibleTypes.length === 0) return null;

  const ctes: SQL[] = [buildSearchInputCte(query.q)];
  if (requiresGlobalRatings(query)) ctes.push(buildRatingsCte());
  if (query.regionId) ctes.push(buildSelectedRegionCte(query.regionId));
  if (query.amenityIds.length > 0) ctes.push(buildAmenityMatchesCte(query.amenityIds));

  const rankedBranches = eligibleTypes.map((entityType) =>
    buildPerEntityRankedBranch(entityType, query)
  );
  ctes.push(
    sql`"search_per_entity_candidates" AS (
      ${sql.join(rankedBranches, sql` UNION ALL `)}
    )`,
    sql`"search_ranked_page" AS MATERIALIZED (
      SELECT
        "search_per_entity_candidates"."entityType",
        "search_per_entity_candidates"."entityOrder",
        "search_per_entity_candidates"."id",
        "search_per_entity_candidates"."relevance",
        "search_per_entity_candidates"."rawRating"
      FROM "search_per_entity_candidates"
      ORDER BY ${buildOrderBy(query)}
      LIMIT ${query.limit + 1}::integer
    )`,
    sql`"search_per_entity_hydrated" AS (
      ${sql.join(
        eligibleTypes.map((entityType) => buildPerEntityHydrationBranch(entityType, query)),
        sql` UNION ALL `
      )}
    )`
  );
  if (!requiresGlobalRatings(query)) ctes.push(buildPerEntityPageRatingsCte());

  return sql`
    WITH ${sql.join(ctes, sql`, `)}
    ${buildPerEntityFinalProjection(query)}
  `;
}
