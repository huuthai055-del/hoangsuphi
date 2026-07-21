import type { Database } from '@/lib/database/client';
import {
  amenities,
  articleCategories,
  articles,
  attractionCategories,
  attractions,
  businessAmenities,
  businessPublicContacts,
  businesses,
  businessTypes,
  media,
  mediaVariants,
  regions,
  reviews,
  touristPlaces,
} from '@/lib/database/schema';
import { type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type {
  IPublicCatalogRepository,
  PublicCatalogContactProjection,
  PublicCatalogDetailProjection,
  PublicCatalogItemProjection,
  PublicCatalogKind,
  PublicCatalogMediaSource,
  PublicCatalogPageCriteria,
  PublicCatalogReferenceProjection,
  PublicCatalogRelatedProjection,
  PublicReferenceKind,
} from './public-catalog.types';

const parentRegions = alias(regions, 'public_catalog_parent_region');

interface RawCatalogRow extends Record<string, unknown> {
  entityType: string;
  id: string;
  name: string;
  slug: string;
  summarySource: string | null;
  descriptionSource: string | null;
  contentSource: string | null;
  updatedAt: Date | string;
  nameKey: string;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  taxonomyId: string | null;
  taxonomyName: string | null;
  taxonomySlug: string | null;
  taxonomyIcon: string | null;
  taxonomyCategory: string | null;
  taxonomyColor: string | null;
  taxonomyIsUtility: boolean | null;
  image: unknown;
  media: unknown;
  coverUrlCandidate: string | null;
  ratingAverage: string | null;
  ratingCount: number | string;
  priceMin: string | null;
  priceMax: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  amenities: unknown;
  phoneE164: string | null;
  zaloUrl: string | null;
  websiteUrl: string | null;
  related: unknown;
}

interface RawReferenceRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  category: string | null;
  color: string | null;
  parentId: string | null;
  level: number | string | null;
  isUtility: boolean | null;
}

export class PublicCatalogRepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Public catalog repository ${operation} failed`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = 'PublicCatalogRepositoryError';
  }
}

class PublicCatalogRepositoryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicCatalogRepositoryInvariantError';
  }
}

export class DrizzlePublicCatalogRepository implements IPublicCatalogRepository {
  constructor(private readonly database: Database) {}

  async findPage(criteria: PublicCatalogPageCriteria): Promise<PublicCatalogItemProjection[]> {
    const statement = this.buildPageStatement(criteria);
    const rows = await this.executeRows<RawCatalogRow>(statement, `${criteria.kind} page`);
    return rows.map((row) => this.mapItem(row));
  }

  async findDetail(
    kind: PublicCatalogKind,
    slug: string
  ): Promise<PublicCatalogDetailProjection | null> {
    const rows = await this.executeRows<RawCatalogRow>(
      this.buildDetailStatement(kind, slug),
      `${kind} detail`
    );
    const row = rows[0];
    return row ? this.mapDetail(row) : null;
  }

  async listReferences(kind: PublicReferenceKind): Promise<PublicCatalogReferenceProjection[]> {
    const rows = await this.executeRows<RawReferenceRow>(
      this.buildReferenceStatement(kind),
      `${kind} references`
    );
    return rows.map((row) => this.mapReference(row));
  }

  private buildPageStatement(criteria: PublicCatalogPageCriteria): SQL {
    switch (criteria.kind) {
      case 'businesses':
        return this.buildBusinessPage(criteria);
      case 'places':
        return this.buildPlacePage(criteria);
      case 'attractions':
        return this.buildAttractionPage(criteria);
      case 'articles':
        return this.buildArticlePage(criteria);
      case 'regions':
        return this.buildRegionPage(criteria);
    }
  }

  private buildDetailStatement(kind: PublicCatalogKind, slug: string): SQL {
    switch (kind) {
      case 'businesses':
        return this.buildBusinessDetail(slug);
      case 'places':
        return this.buildPlaceDetail(slug);
      case 'attractions':
        return this.buildAttractionDetail(slug);
      case 'articles':
        return this.buildArticleDetail(slug);
      case 'regions':
        return this.buildRegionDetail(slug);
    }
  }

  private buildBusinessPage(criteria: PublicCatalogPageCriteria): SQL {
    const filters: SQL[] = [
      sql`${businesses.status} = 'active'`,
      sql`${businesses.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
      sql`${businessTypes.isActive} = TRUE`,
    ];
    if (criteria.regionSlug) filters.push(sql`${regions.slug} = ${criteria.regionSlug}`);
    if (criteria.businessTypeSlug) {
      filters.push(sql`${businessTypes.code} = ${criteria.businessTypeSlug}`);
    }
    if (criteria.amenitySlugs.length > 0) {
      const amenityValues = sql.join(
        criteria.amenitySlugs.map((slug) => sql`${slug}`),
        sql`, `
      );
      filters.push(sql`(
        SELECT COUNT(DISTINCT ${amenities.code})::integer
        FROM ${businessAmenities}
        INNER JOIN ${amenities} ON ${amenities.id} = ${businessAmenities.amenityId}
        WHERE ${businessAmenities.businessId} = ${businesses.id}
          AND ${amenities.code} IN (${amenityValues})
      ) = ${criteria.amenitySlugs.length}::integer`);
    }
    const keyset = this.buildKeyset(
      criteria,
      sql`${businesses.updatedAt}`,
      sql`${businesses.name}`,
      sql`${businesses.id}`
    );
    return sql`
      SELECT
        'business'::text AS "entityType", ${businesses.id} AS "id", ${businesses.name}::text AS "name",
        ${businesses.slug}::text AS "slug", ${businesses.description}::text AS "summarySource",
        NULL::text AS "descriptionSource", NULL::text AS "contentSource", ${businesses.updatedAt} AS "updatedAt",
        LOWER(${businesses.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        ${businessTypes.id} AS "taxonomyId", ${businessTypes.name}::text AS "taxonomyName",
        ${businessTypes.code}::text AS "taxonomySlug", ${businessTypes.icon}::text AS "taxonomyIcon",
        NULL::text AS "taxonomyCategory", ${businessTypes.mapColor}::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.ownerType} = 'BUSINESS' AND ${media.ownerId} = ${businesses.id}`)} AS "image",
        '[]'::jsonb AS "media", ${businesses.coverUrl}::text AS "coverUrlCandidate",
        "catalog_rating"."average" AS "ratingAverage", "catalog_rating"."count" AS "ratingCount",
        ${businesses.priceMin}::text AS "priceMin", ${businesses.priceMax}::text AS "priceMax",
        NULL::double precision AS "latitude", NULL::double precision AS "longitude",
        '[]'::jsonb AS "amenities", NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl"
      FROM ${businesses}
      INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
      INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('BUSINESS', sql`${businesses.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${sql.join(filters, sql` AND `)} ${keyset}
      ${this.buildOrder(criteria, sql`${businesses.updatedAt}`, sql`${businesses.name}`, sql`${businesses.id}`)}
      LIMIT ${criteria.limit + 1}::integer
    `;
  }

  private buildPlacePage(criteria: PublicCatalogPageCriteria): SQL {
    const filters: SQL[] = [
      sql`${touristPlaces.status} = 'active'`,
      sql`${touristPlaces.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
    ];
    if (criteria.regionSlug) filters.push(sql`${regions.slug} = ${criteria.regionSlug}`);
    const keyset = this.buildKeyset(
      criteria,
      sql`${touristPlaces.updatedAt}`,
      sql`${touristPlaces.name}`,
      sql`${touristPlaces.id}`
    );
    return sql`
      SELECT
        'place'::text AS "entityType", ${touristPlaces.id} AS "id", ${touristPlaces.name}::text AS "name",
        ${touristPlaces.slug}::text AS "slug", ${touristPlaces.description}::text AS "summarySource",
        NULL::text AS "descriptionSource", NULL::text AS "contentSource", ${touristPlaces.updatedAt} AS "updatedAt",
        LOWER(${touristPlaces.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        NULL::uuid AS "taxonomyId", NULL::text AS "taxonomyName", NULL::text AS "taxonomySlug",
        NULL::text AS "taxonomyIcon", NULL::text AS "taxonomyCategory", NULL::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.ownerType} = 'PLACE' AND ${media.ownerId} = ${touristPlaces.id}`)} AS "image",
        '[]'::jsonb AS "media", ${touristPlaces.coverUrl}::text AS "coverUrlCandidate",
        "catalog_rating"."average" AS "ratingAverage", "catalog_rating"."count" AS "ratingCount",
        NULL::text AS "priceMin", NULL::text AS "priceMax", NULL::double precision AS "latitude",
        NULL::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl"
      FROM ${touristPlaces}
      INNER JOIN ${regions} ON ${regions.id} = ${touristPlaces.regionId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('PLACE', sql`${touristPlaces.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${sql.join(filters, sql` AND `)} ${keyset}
      ${this.buildOrder(criteria, sql`${touristPlaces.updatedAt}`, sql`${touristPlaces.name}`, sql`${touristPlaces.id}`)}
      LIMIT ${criteria.limit + 1}::integer
    `;
  }

  private buildAttractionPage(criteria: PublicCatalogPageCriteria): SQL {
    const filters: SQL[] = [
      sql`${attractions.status} = 'active'`,
      sql`${attractions.deletedAt} IS NULL`,
      sql`${regions.deletedAt} IS NULL`,
    ];
    if (criteria.regionSlug) filters.push(sql`${regions.slug} = ${criteria.regionSlug}`);
    if (criteria.categorySlug)
      filters.push(sql`${attractionCategories.code} = ${criteria.categorySlug}`);
    const keyset = this.buildKeyset(
      criteria,
      sql`${attractions.updatedAt}`,
      sql`${attractions.name}`,
      sql`${attractions.id}`
    );
    return sql`
      SELECT
        'attraction'::text AS "entityType", ${attractions.id} AS "id", ${attractions.name}::text AS "name",
        ${attractions.slug}::text AS "slug", ${attractions.description}::text AS "summarySource",
        NULL::text AS "descriptionSource", NULL::text AS "contentSource", ${attractions.updatedAt} AS "updatedAt",
        LOWER(${attractions.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        ${attractionCategories.id} AS "taxonomyId", ${attractionCategories.name}::text AS "taxonomyName",
        ${attractionCategories.code}::text AS "taxonomySlug", ${attractionCategories.mapIcon}::text AS "taxonomyIcon",
        NULL::text AS "taxonomyCategory", ${attractionCategories.mapColor}::text AS "taxonomyColor",
        ${attractionCategories.isUtility} AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.ownerType} = 'ATTRACTION' AND ${media.ownerId} = ${attractions.id}`)} AS "image",
        '[]'::jsonb AS "media", ${attractions.coverUrl}::text AS "coverUrlCandidate",
        "catalog_rating"."average" AS "ratingAverage", "catalog_rating"."count" AS "ratingCount",
        NULL::text AS "priceMin", NULL::text AS "priceMax", NULL::double precision AS "latitude",
        NULL::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl"
      FROM ${attractions}
      INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
      INNER JOIN ${attractionCategories} ON ${attractionCategories.id} = ${attractions.categoryId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('ATTRACTION', sql`${attractions.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${sql.join(filters, sql` AND `)} ${keyset}
      ${this.buildOrder(criteria, sql`${attractions.updatedAt}`, sql`${attractions.name}`, sql`${attractions.id}`)}
      LIMIT ${criteria.limit + 1}::integer
    `;
  }

  private buildArticlePage(criteria: PublicCatalogPageCriteria): SQL {
    const filters: SQL[] = [
      sql`${articles.status} = 'published'::public.article_status`,
      sql`${articles.publishedAt} IS NOT NULL`,
      sql`${articles.publishedAt} <= CURRENT_TIMESTAMP`,
      sql`${articles.deletedAt} IS NULL`,
    ];
    if (criteria.categorySlug)
      filters.push(sql`${articleCategories.code} = ${criteria.categorySlug}`);
    const keyset = this.buildKeyset(
      criteria,
      sql`${articles.updatedAt}`,
      sql`${articles.title}`,
      sql`${articles.id}`
    );
    return sql`
      SELECT
        'article'::text AS "entityType", ${articles.id} AS "id", ${articles.title}::text AS "name",
        ${articles.slug}::text AS "slug", ${articles.excerpt}::text AS "summarySource",
        NULL::text AS "descriptionSource", NULL::text AS "contentSource", ${articles.updatedAt} AS "updatedAt",
        LOWER(${articles.title})::text AS "nameKey", NULL::uuid AS "regionId", NULL::text AS "regionName",
        NULL::text AS "regionSlug", ${articleCategories.id} AS "taxonomyId",
        ${articleCategories.name}::text AS "taxonomyName", ${articleCategories.code}::text AS "taxonomySlug",
        NULL::text AS "taxonomyIcon", NULL::text AS "taxonomyCategory", NULL::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.id} = ${articles.thumbnailId} AND ${media.ownerType} = 'ARTICLE' AND ${media.ownerId} = ${articles.id}`)} AS "image",
        '[]'::jsonb AS "media", NULL::text AS "coverUrlCandidate",
        "catalog_rating"."average" AS "ratingAverage", "catalog_rating"."count" AS "ratingCount",
        NULL::text AS "priceMin", NULL::text AS "priceMax", NULL::double precision AS "latitude",
        NULL::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl"
      FROM ${articles}
      INNER JOIN ${articleCategories} ON ${articleCategories.id} = ${articles.categoryId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('ARTICLE', sql`${articles.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${sql.join(filters, sql` AND `)} ${keyset}
      ${this.buildOrder(criteria, sql`${articles.updatedAt}`, sql`${articles.title}`, sql`${articles.id}`)}
      LIMIT ${criteria.limit + 1}::integer
    `;
  }

  private buildRegionPage(criteria: PublicCatalogPageCriteria): SQL {
    const filters: SQL[] = [sql`${regions.deletedAt} IS NULL`];
    if (criteria.parentRegionSlug)
      filters.push(sql`${parentRegions.slug} = ${criteria.parentRegionSlug}`);
    const keyset = this.buildKeyset(
      criteria,
      sql`${regions.updatedAt}`,
      sql`${regions.name}`,
      sql`${regions.id}`
    );
    return sql`
      SELECT
        'region'::text AS "entityType", ${regions.id} AS "id", ${regions.name}::text AS "name",
        ${regions.slug}::text AS "slug", ${regions.description}::text AS "summarySource",
        NULL::text AS "descriptionSource", NULL::text AS "contentSource", ${regions.updatedAt} AS "updatedAt",
        LOWER(${regions.name})::text AS "nameKey", NULL::uuid AS "regionId", NULL::text AS "regionName",
        NULL::text AS "regionSlug", NULL::uuid AS "taxonomyId", NULL::text AS "taxonomyName",
        NULL::text AS "taxonomySlug", NULL::text AS "taxonomyIcon", NULL::text AS "taxonomyCategory",
        NULL::text AS "taxonomyColor", NULL::boolean AS "taxonomyIsUtility", NULL::jsonb AS "image",
        '[]'::jsonb AS "media", NULL::text AS "coverUrlCandidate", NULL::text AS "ratingAverage",
        0::integer AS "ratingCount", NULL::text AS "priceMin", NULL::text AS "priceMax",
        NULL::double precision AS "latitude", NULL::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl"
      FROM ${regions}
      LEFT JOIN ${parentRegions} ON ${parentRegions.id} = ${regions.parentId}
      WHERE ${sql.join(filters, sql` AND `)} ${keyset}
      ${this.buildOrder(criteria, sql`${regions.updatedAt}`, sql`${regions.name}`, sql`${regions.id}`)}
      LIMIT ${criteria.limit + 1}::integer
    `;
  }

  private buildBusinessDetail(slug: string): SQL {
    return sql`
      SELECT
        'business'::text AS "entityType", ${businesses.id} AS "id", ${businesses.name}::text AS "name",
        ${businesses.slug}::text AS "slug", ${businesses.description}::text AS "summarySource",
        ${businesses.description}::text AS "descriptionSource", NULL::text AS "contentSource",
        ${businesses.updatedAt} AS "updatedAt", LOWER(${businesses.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        ${businessTypes.id} AS "taxonomyId", ${businessTypes.name}::text AS "taxonomyName",
        ${businessTypes.code}::text AS "taxonomySlug", ${businessTypes.icon}::text AS "taxonomyIcon",
        NULL::text AS "taxonomyCategory", ${businessTypes.mapColor}::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.ownerType} = 'BUSINESS' AND ${media.ownerId} = ${businesses.id}`)} AS "image",
        ${this.buildMediaCollection(sql`${media.ownerType} = 'BUSINESS' AND ${media.ownerId} = ${businesses.id}`)} AS "media",
        ${businesses.coverUrl}::text AS "coverUrlCandidate", "catalog_rating"."average" AS "ratingAverage",
        "catalog_rating"."count" AS "ratingCount", ${businesses.priceMin}::text AS "priceMin",
        ${businesses.priceMax}::text AS "priceMax", ST_Y(${businesses.location}::geometry)::double precision AS "latitude",
        ST_X(${businesses.location}::geometry)::double precision AS "longitude",
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', ${amenities.id}, 'name', ${amenities.name}, 'slug', ${amenities.code},
          'icon', ${amenities.icon}, 'category', ${amenities.category}, 'color', NULL,
          'parentId', NULL, 'level', NULL, 'isUtility', NULL
        ) ORDER BY ${amenities.category}, ${amenities.name}, ${amenities.id})
        FROM ${businessAmenities}
        INNER JOIN ${amenities} ON ${amenities.id} = ${businessAmenities.amenityId}
        WHERE ${businessAmenities.businessId} = ${businesses.id}), '[]'::jsonb) AS "amenities",
        CASE WHEN ${businessPublicContacts.publicationStatus} = 'published'
          AND ${businessPublicContacts.deletedAt} IS NULL
          AND ${businessPublicContacts.consentConfirmedAt} IS NOT NULL
          AND ${businessPublicContacts.consentConfirmedAt} <= CURRENT_TIMESTAMP
          AND ${businessPublicContacts.verifiedAt} IS NOT NULL
          AND ${businessPublicContacts.verifiedAt} <= CURRENT_TIMESTAMP
        THEN ${businessPublicContacts.phoneE164} ELSE NULL END::text AS "phoneE164",
        CASE WHEN ${businessPublicContacts.publicationStatus} = 'published'
          AND ${businessPublicContacts.deletedAt} IS NULL
          AND ${businessPublicContacts.consentConfirmedAt} IS NOT NULL
          AND ${businessPublicContacts.consentConfirmedAt} <= CURRENT_TIMESTAMP
          AND ${businessPublicContacts.verifiedAt} IS NOT NULL
          AND ${businessPublicContacts.verifiedAt} <= CURRENT_TIMESTAMP
        THEN ${businessPublicContacts.zaloUrl} ELSE NULL END::text AS "zaloUrl",
        CASE WHEN ${businessPublicContacts.publicationStatus} = 'published'
          AND ${businessPublicContacts.deletedAt} IS NULL
          AND ${businessPublicContacts.consentConfirmedAt} IS NOT NULL
          AND ${businessPublicContacts.consentConfirmedAt} <= CURRENT_TIMESTAMP
          AND ${businessPublicContacts.verifiedAt} IS NOT NULL
          AND ${businessPublicContacts.verifiedAt} <= CURRENT_TIMESTAMP
        THEN ${businessPublicContacts.websiteUrl} ELSE NULL END::text AS "websiteUrl",
        ${this.buildRelatedCollection('businesses')} AS "related"
      FROM ${businesses}
      INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
      INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
      LEFT JOIN ${businessPublicContacts} ON ${businessPublicContacts.businessId} = ${businesses.id}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('BUSINESS', sql`${businesses.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${businesses.slug} = ${slug} AND ${businesses.status} = 'active'
        AND ${businesses.deletedAt} IS NULL AND ${regions.deletedAt} IS NULL AND ${businessTypes.isActive} = TRUE
      LIMIT 1
    `;
  }

  private buildPlaceDetail(slug: string): SQL {
    return this.buildSpatialDetail(
      'place',
      'PLACE',
      touristPlaces,
      slug,
      sql`${touristPlaces.status} = 'active' AND ${touristPlaces.deletedAt} IS NULL`,
      sql`${media.ownerType} = 'PLACE' AND ${media.ownerId} = ${touristPlaces.id}`,
      sql`${touristPlaces.coverUrl}`
    );
  }

  private buildAttractionDetail(slug: string): SQL {
    return sql`
      SELECT
        'attraction'::text AS "entityType", ${attractions.id} AS "id", ${attractions.name}::text AS "name",
        ${attractions.slug}::text AS "slug", ${attractions.description}::text AS "summarySource",
        ${attractions.description}::text AS "descriptionSource", NULL::text AS "contentSource",
        ${attractions.updatedAt} AS "updatedAt", LOWER(${attractions.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        ${attractionCategories.id} AS "taxonomyId", ${attractionCategories.name}::text AS "taxonomyName",
        ${attractionCategories.code}::text AS "taxonomySlug", ${attractionCategories.mapIcon}::text AS "taxonomyIcon",
        NULL::text AS "taxonomyCategory", ${attractionCategories.mapColor}::text AS "taxonomyColor",
        ${attractionCategories.isUtility} AS "taxonomyIsUtility",
        ${this.buildFirstMedia(sql`${media.ownerType} = 'ATTRACTION' AND ${media.ownerId} = ${attractions.id}`)} AS "image",
        ${this.buildMediaCollection(sql`${media.ownerType} = 'ATTRACTION' AND ${media.ownerId} = ${attractions.id}`)} AS "media",
        ${attractions.coverUrl}::text AS "coverUrlCandidate", "catalog_rating"."average" AS "ratingAverage",
        "catalog_rating"."count" AS "ratingCount", NULL::text AS "priceMin", NULL::text AS "priceMax",
        ST_Y(${attractions.location}::geometry)::double precision AS "latitude",
        ST_X(${attractions.location}::geometry)::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl",
        ${this.buildRelatedCollection('attractions')} AS "related"
      FROM ${attractions}
      INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
      INNER JOIN ${attractionCategories} ON ${attractionCategories.id} = ${attractions.categoryId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('ATTRACTION', sql`${attractions.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${attractions.slug} = ${slug} AND ${attractions.status} = 'active'
        AND ${attractions.deletedAt} IS NULL AND ${regions.deletedAt} IS NULL
      LIMIT 1
    `;
  }

  private buildArticleDetail(slug: string): SQL {
    const articleThumbnailCondition = sql`${media.id} = ${articles.thumbnailId} AND ${media.ownerType} = 'ARTICLE' AND ${media.ownerId} = ${articles.id}`;
    const articleMediaCondition = sql`${media.ownerType} = 'ARTICLE' AND ${media.ownerId} = ${articles.id}`;
    return sql`
      SELECT
        'article'::text AS "entityType", ${articles.id} AS "id", ${articles.title}::text AS "name",
        ${articles.slug}::text AS "slug", ${articles.excerpt}::text AS "summarySource",
        ${articles.excerpt}::text AS "descriptionSource", ${articles.content}::text AS "contentSource",
        ${articles.updatedAt} AS "updatedAt", LOWER(${articles.title})::text AS "nameKey",
        NULL::uuid AS "regionId", NULL::text AS "regionName", NULL::text AS "regionSlug",
        ${articleCategories.id} AS "taxonomyId", ${articleCategories.name}::text AS "taxonomyName",
        ${articleCategories.code}::text AS "taxonomySlug", NULL::text AS "taxonomyIcon",
        NULL::text AS "taxonomyCategory", NULL::text AS "taxonomyColor", NULL::boolean AS "taxonomyIsUtility",
        ${this.buildFirstMedia(articleThumbnailCondition)} AS "image", ${this.buildMediaCollection(articleMediaCondition)} AS "media",
        NULL::text AS "coverUrlCandidate", "catalog_rating"."average" AS "ratingAverage",
        "catalog_rating"."count" AS "ratingCount", NULL::text AS "priceMin", NULL::text AS "priceMax",
        NULL::double precision AS "latitude", NULL::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl",
        ${this.buildRelatedCollection('articles')} AS "related"
      FROM ${articles}
      INNER JOIN ${articleCategories} ON ${articleCategories.id} = ${articles.categoryId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate('ARTICLE', sql`${articles.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${articles.slug} = ${slug} AND ${articles.status} = 'published'::public.article_status
        AND ${articles.publishedAt} IS NOT NULL AND ${articles.publishedAt} <= CURRENT_TIMESTAMP
        AND ${articles.deletedAt} IS NULL
      LIMIT 1
    `;
  }

  private buildRegionDetail(slug: string): SQL {
    return sql`
      SELECT
        'region'::text AS "entityType", ${regions.id} AS "id", ${regions.name}::text AS "name",
        ${regions.slug}::text AS "slug", ${regions.description}::text AS "summarySource",
        ${regions.description}::text AS "descriptionSource", NULL::text AS "contentSource",
        ${regions.updatedAt} AS "updatedAt", LOWER(${regions.name})::text AS "nameKey",
        NULL::uuid AS "regionId", NULL::text AS "regionName", NULL::text AS "regionSlug",
        NULL::uuid AS "taxonomyId", NULL::text AS "taxonomyName", NULL::text AS "taxonomySlug",
        NULL::text AS "taxonomyIcon", NULL::text AS "taxonomyCategory", NULL::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility", NULL::jsonb AS "image", '[]'::jsonb AS "media",
        NULL::text AS "coverUrlCandidate", NULL::text AS "ratingAverage", 0::integer AS "ratingCount",
        NULL::text AS "priceMin", NULL::text AS "priceMax", ${regions.latitude}::double precision AS "latitude",
        ${regions.longitude}::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl",
        ${this.buildRelatedCollection('regions')} AS "related"
      FROM ${regions}
      WHERE ${regions.slug} = ${slug} AND ${regions.deletedAt} IS NULL
      LIMIT 1
    `;
  }

  private buildSpatialDetail(
    entityType: 'place',
    ownerType: 'PLACE',
    table: typeof touristPlaces,
    slug: string,
    eligibility: SQL,
    mediaCondition: SQL,
    coverUrl: SQL
  ): SQL {
    return sql`
      SELECT
        ${entityType}::text AS "entityType", ${table.id} AS "id", ${table.name}::text AS "name",
        ${table.slug}::text AS "slug", ${table.description}::text AS "summarySource",
        ${table.description}::text AS "descriptionSource", NULL::text AS "contentSource",
        ${table.updatedAt} AS "updatedAt", LOWER(${table.name})::text AS "nameKey",
        ${regions.id} AS "regionId", ${regions.name}::text AS "regionName", ${regions.slug}::text AS "regionSlug",
        NULL::uuid AS "taxonomyId", NULL::text AS "taxonomyName", NULL::text AS "taxonomySlug",
        NULL::text AS "taxonomyIcon", NULL::text AS "taxonomyCategory", NULL::text AS "taxonomyColor",
        NULL::boolean AS "taxonomyIsUtility", ${this.buildFirstMedia(mediaCondition)} AS "image",
        ${this.buildMediaCollection(mediaCondition)} AS "media", ${coverUrl}::text AS "coverUrlCandidate",
        "catalog_rating"."average" AS "ratingAverage", "catalog_rating"."count" AS "ratingCount",
        NULL::text AS "priceMin", NULL::text AS "priceMax", ST_Y(${table.location}::geometry)::double precision AS "latitude",
        ST_X(${table.location}::geometry)::double precision AS "longitude", '[]'::jsonb AS "amenities",
        NULL::text AS "phoneE164", NULL::text AS "zaloUrl", NULL::text AS "websiteUrl",
        ${this.buildRelatedCollection('places')} AS "related"
      FROM ${table}
      INNER JOIN ${regions} ON ${regions.id} = ${table.regionId}
      LEFT JOIN LATERAL (${this.buildRatingAggregate(ownerType, sql`${table.id}`)}) AS "catalog_rating" ON TRUE
      WHERE ${table.slug} = ${slug} AND ${eligibility} AND ${regions.deletedAt} IS NULL
      LIMIT 1
    `;
  }

  private buildReferenceStatement(kind: PublicReferenceKind): SQL {
    switch (kind) {
      case 'business-types':
        return sql`SELECT ${businessTypes.id} AS "id", ${businessTypes.name}::text AS "name", ${businessTypes.code}::text AS "slug",
          ${businessTypes.icon}::text AS "icon", NULL::text AS "category", ${businessTypes.mapColor}::text AS "color",
          NULL::uuid AS "parentId", NULL::integer AS "level", NULL::boolean AS "isUtility"
          FROM ${businessTypes} WHERE ${businessTypes.isActive} = TRUE
          ORDER BY ${businessTypes.sortOrder}, ${businessTypes.name}, ${businessTypes.id}`;
      case 'amenities':
        return sql`SELECT ${amenities.id} AS "id", ${amenities.name}::text AS "name", ${amenities.code}::text AS "slug",
          ${amenities.icon}::text AS "icon", ${amenities.category}::text AS "category", NULL::text AS "color",
          NULL::uuid AS "parentId", NULL::integer AS "level", NULL::boolean AS "isUtility"
          FROM ${amenities}
          WHERE EXISTS (SELECT 1 FROM ${businessAmenities}
            INNER JOIN ${businesses} ON ${businesses.id} = ${businessAmenities.businessId}
            INNER JOIN ${regions} ON ${regions.id} = ${businesses.regionId}
            INNER JOIN ${businessTypes} ON ${businessTypes.id} = ${businesses.businessTypeId}
            WHERE ${businessAmenities.amenityId} = ${amenities.id} AND ${businesses.status} = 'active'
              AND ${businesses.deletedAt} IS NULL AND ${regions.deletedAt} IS NULL AND ${businessTypes.isActive} = TRUE)
          ORDER BY ${amenities.category}, ${amenities.name}, ${amenities.id}`;
      case 'article-categories':
        return sql`SELECT ${articleCategories.id} AS "id", ${articleCategories.name}::text AS "name",
          ${articleCategories.code}::text AS "slug", NULL::text AS "icon", NULL::text AS "category",
          NULL::text AS "color", NULL::uuid AS "parentId", NULL::integer AS "level", NULL::boolean AS "isUtility"
          FROM ${articleCategories}
          WHERE EXISTS (SELECT 1 FROM ${articles} WHERE ${articles.categoryId} = ${articleCategories.id}
            AND ${articles.status} = 'published'::public.article_status AND ${articles.publishedAt} <= CURRENT_TIMESTAMP
            AND ${articles.deletedAt} IS NULL)
          ORDER BY ${articleCategories.name}, ${articleCategories.id}`;
      case 'attraction-categories':
        return sql`SELECT ${attractionCategories.id} AS "id", ${attractionCategories.name}::text AS "name",
          ${attractionCategories.code}::text AS "slug", ${attractionCategories.mapIcon}::text AS "icon",
          NULL::text AS "category", ${attractionCategories.mapColor}::text AS "color", NULL::uuid AS "parentId",
          NULL::integer AS "level", ${attractionCategories.isUtility} AS "isUtility"
          FROM ${attractionCategories}
          WHERE EXISTS (SELECT 1 FROM ${attractions}
            INNER JOIN ${regions} ON ${regions.id} = ${attractions.regionId}
            WHERE ${attractions.categoryId} = ${attractionCategories.id} AND ${attractions.status} = 'active'
              AND ${attractions.deletedAt} IS NULL AND ${regions.deletedAt} IS NULL)
          ORDER BY ${attractionCategories.name}, ${attractionCategories.id}`;
      case 'regions':
        return sql`SELECT ${regions.id} AS "id", ${regions.name}::text AS "name", ${regions.slug}::text AS "slug",
          NULL::text AS "icon", NULL::text AS "category", NULL::text AS "color", ${regions.parentId} AS "parentId",
          ${regions.level}::integer AS "level", NULL::boolean AS "isUtility"
          FROM ${regions} WHERE ${regions.deletedAt} IS NULL
          ORDER BY ${regions.path}, ${regions.name}, ${regions.id}`;
    }
  }

  private buildRelatedCollection(kind: PublicCatalogKind): SQL {
    switch (kind) {
      case 'businesses':
        return sql.raw(`COALESCE((
          SELECT jsonb_agg(related_item.projection ORDER BY related_item.updated_at DESC, related_item.name_key, related_item.id)
          FROM (
            SELECT jsonb_build_object('entityType', 'business', 'id', rb.id, 'name', rb.name, 'slug', rb.slug) AS projection,
              rb.updated_at, LOWER(rb.name)::text AS name_key, rb.id
            FROM businesses AS rb
            INNER JOIN regions AS rr ON rr.id = rb.region_id
            INNER JOIN business_types AS rbt ON rbt.id = rb.business_type_id
            WHERE rb.id <> businesses.id AND rb.region_id = businesses.region_id
              AND rb.status = 'active' AND rb.deleted_at IS NULL
              AND rr.deleted_at IS NULL AND rbt.is_active = TRUE
            ORDER BY rb.updated_at DESC, LOWER(rb.name), rb.id
            LIMIT 6
          ) AS related_item
        ), '[]'::jsonb)`);
      case 'places':
        return sql.raw(`COALESCE((
          SELECT jsonb_agg(related_item.projection ORDER BY related_item.updated_at DESC, related_item.name_key, related_item.id)
          FROM (
            SELECT jsonb_build_object('entityType', 'place', 'id', rp.id, 'name', rp.name, 'slug', rp.slug) AS projection,
              rp.updated_at, LOWER(rp.name)::text AS name_key, rp.id
            FROM tourist_places AS rp
            INNER JOIN regions AS rr ON rr.id = rp.region_id
            WHERE rp.id <> tourist_places.id AND rp.region_id = tourist_places.region_id
              AND rp.status = 'active' AND rp.deleted_at IS NULL AND rr.deleted_at IS NULL
            ORDER BY rp.updated_at DESC, LOWER(rp.name), rp.id
            LIMIT 6
          ) AS related_item
        ), '[]'::jsonb)`);
      case 'attractions':
        return sql.raw(`COALESCE((
          SELECT jsonb_agg(related_item.projection ORDER BY related_item.updated_at DESC, related_item.name_key, related_item.id)
          FROM (
            SELECT jsonb_build_object('entityType', 'attraction', 'id', ra.id, 'name', ra.name, 'slug', ra.slug) AS projection,
              ra.updated_at, LOWER(ra.name)::text AS name_key, ra.id
            FROM attractions AS ra
            INNER JOIN regions AS rr ON rr.id = ra.region_id
            WHERE ra.id <> attractions.id AND ra.category_id = attractions.category_id
              AND ra.status = 'active' AND ra.deleted_at IS NULL AND rr.deleted_at IS NULL
            ORDER BY ra.updated_at DESC, LOWER(ra.name), ra.id
            LIMIT 6
          ) AS related_item
        ), '[]'::jsonb)`);
      case 'articles':
        return sql.raw(`COALESCE((
          SELECT jsonb_agg(related_item.projection ORDER BY related_item.updated_at DESC, related_item.name_key, related_item.id)
          FROM (
            SELECT jsonb_build_object('entityType', 'article', 'id', ra.id, 'name', ra.title, 'slug', ra.slug) AS projection,
              ra.updated_at, LOWER(ra.title)::text AS name_key, ra.id
            FROM articles AS ra
            WHERE ra.id <> articles.id AND ra.category_id = articles.category_id
              AND ra.status = 'published'::public.article_status
              AND ra.published_at IS NOT NULL AND ra.published_at <= CURRENT_TIMESTAMP
              AND ra.deleted_at IS NULL
            ORDER BY ra.updated_at DESC, LOWER(ra.title), ra.id
            LIMIT 6
          ) AS related_item
        ), '[]'::jsonb)`);
      case 'regions':
        return sql.raw(`COALESCE((
          SELECT jsonb_agg(related_item.projection ORDER BY related_item.name_key, related_item.id)
          FROM (
            SELECT jsonb_build_object('entityType', 'region', 'id', rr.id, 'name', rr.name, 'slug', rr.slug) AS projection,
              LOWER(rr.name)::text AS name_key, rr.id
            FROM regions AS rr
            WHERE rr.id <> regions.id AND rr.parent_id IS NOT DISTINCT FROM regions.parent_id
              AND rr.deleted_at IS NULL
            ORDER BY LOWER(rr.name), rr.id
            LIMIT 6
          ) AS related_item
        ), '[]'::jsonb)`);
    }
  }

  private buildKeyset(
    criteria: PublicCatalogPageCriteria,
    updatedAt: SQL,
    name: SQL,
    id: SQL
  ): SQL {
    const after = criteria.after;
    if (!after) return sql``;
    if (criteria.sort === 'newest') {
      if (!after.sortTimestamp)
        throw new PublicCatalogRepositoryInvariantError('Newest cursor timestamp is missing');
      const timestamp = after.sortTimestamp.toISOString();
      return sql`AND (
        ${updatedAt} < ${timestamp}::timestamptz
        OR (${updatedAt} = ${timestamp}::timestamptz AND LOWER(${name}) > ${after.nameKey})
        OR (${updatedAt} = ${timestamp}::timestamptz AND LOWER(${name}) = ${after.nameKey} AND ${id} > ${after.id}::uuid)
      )`;
    }
    return sql`AND (LOWER(${name}) > ${after.nameKey} OR (LOWER(${name}) = ${after.nameKey} AND ${id} > ${after.id}::uuid))`;
  }

  private buildOrder(criteria: PublicCatalogPageCriteria, updatedAt: SQL, name: SQL, id: SQL): SQL {
    return criteria.sort === 'newest'
      ? sql`ORDER BY ${updatedAt} DESC, LOWER(${name}) ASC, ${id} ASC`
      : sql`ORDER BY LOWER(${name}) ASC, ${id} ASC`;
  }

  private buildRatingAggregate(
    ownerType: 'BUSINESS' | 'PLACE' | 'ATTRACTION' | 'ARTICLE',
    ownerId: SQL
  ): SQL {
    return sql`SELECT ROUND(AVG(${reviews.rating}::numeric), 2)::text AS "average",
      COUNT(${reviews.id})::integer AS "count" FROM ${reviews}
      WHERE ${reviews.ownerType} = ${ownerType}::public.owner_type AND ${reviews.ownerId} = ${ownerId}
        AND ${reviews.status} = 'APPROVED'::public.review_status AND ${reviews.deletedAt} IS NULL`;
  }

  private buildFirstMedia(condition: SQL): SQL {
    return sql`(SELECT jsonb_build_object(
      'id', ${media.id}, 'storageProvider', ${media.storageProvider},
      'storageKey', COALESCE("preferred_variant"."storageKey", ${media.storageKey}),
      'width', "preferred_variant"."width", 'height', "preferred_variant"."height", 'altText', ${media.altText}
    ) FROM ${media}
    LEFT JOIN LATERAL (${this.buildPreferredVariant()}) AS "preferred_variant" ON TRUE
    WHERE ${condition} AND ${media.mediaType} = 'IMAGE' AND ${media.status} = 'READY' AND ${media.deletedAt} IS NULL
    ORDER BY ${media.createdAt}, ${media.id} LIMIT 1)`;
  }

  private buildMediaCollection(condition: SQL): SQL {
    return sql`COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', "eligible_media"."id", 'storageProvider', "eligible_media"."storageProvider",
      'storageKey', "eligible_media"."storageKey", 'width', "eligible_media"."width",
      'height', "eligible_media"."height", 'altText', "eligible_media"."altText"
    ) ORDER BY "eligible_media"."createdAt", "eligible_media"."id") FROM (
      SELECT ${media.id} AS "id", ${media.storageProvider}::text AS "storageProvider",
        COALESCE("preferred_variant"."storageKey", ${media.storageKey})::text AS "storageKey",
        "preferred_variant"."width"::integer AS "width", "preferred_variant"."height"::integer AS "height",
        ${media.altText}::text AS "altText", ${media.createdAt} AS "createdAt"
      FROM ${media}
      LEFT JOIN LATERAL (${this.buildPreferredVariant()}) AS "preferred_variant" ON TRUE
      WHERE ${condition} AND ${media.mediaType} = 'IMAGE' AND ${media.status} = 'READY' AND ${media.deletedAt} IS NULL
      ORDER BY ${media.createdAt}, ${media.id} LIMIT 12
    ) AS "eligible_media"), '[]'::jsonb)`;
  }

  private buildPreferredVariant(): SQL {
    return sql`SELECT ${mediaVariants.storageKey}::text AS "storageKey", ${mediaVariants.width}::integer AS "width",
      ${mediaVariants.height}::integer AS "height" FROM ${mediaVariants}
      WHERE ${mediaVariants.mediaId} = ${media.id} AND ${mediaVariants.variantType} IN ('large', 'medium', 'original')
      ORDER BY CASE ${mediaVariants.variantType} WHEN 'large' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        ${mediaVariants.variantType}, ${mediaVariants.id} LIMIT 1`;
  }

  private mapItem(row: RawCatalogRow): PublicCatalogItemProjection {
    if (!['business', 'place', 'attraction', 'article', 'region'].includes(row.entityType)) {
      throw new PublicCatalogRepositoryInvariantError('Unknown public catalog entity type');
    }
    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);
    if (!row.id || !row.name || !row.slug || !row.nameKey || Number.isNaN(updatedAt.getTime())) {
      throw new PublicCatalogRepositoryInvariantError('Incomplete public catalog projection');
    }
    const ratingCount = Number(row.ratingCount);
    if (!Number.isInteger(ratingCount) || ratingCount < 0) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public catalog rating count');
    }
    return {
      entityType: row.entityType as PublicCatalogItemProjection['entityType'],
      id: row.id,
      name: row.name,
      slug: row.slug,
      summarySource: row.summarySource,
      updatedAt,
      nameKey: row.nameKey,
      region: this.mapRegion(row),
      taxonomy: this.mapTaxonomy(row),
      image: this.mapOptionalMedia(row.image),
      coverUrlCandidate: row.coverUrlCandidate,
      rating: { average: row.ratingAverage, count: ratingCount },
      priceMin: row.priceMin,
      priceMax: row.priceMax,
    };
  }

  private mapDetail(row: RawCatalogRow): PublicCatalogDetailProjection {
    const item = this.mapItem(row);
    const latitude = row.latitude === null ? null : Number(row.latitude);
    const longitude = row.longitude === null ? null : Number(row.longitude);
    if ((latitude === null) !== (longitude === null)) {
      throw new PublicCatalogRepositoryInvariantError('Incomplete public catalog location');
    }
    return {
      ...item,
      descriptionSource: row.descriptionSource,
      contentSource: row.contentSource,
      location:
        latitude === null || longitude === null ? null : this.assertLocation(latitude, longitude),
      media: this.mapMediaArray(row.media),
      amenities: this.mapReferenceArray(row.amenities),
      contact: this.mapContact(row),
      related: this.mapRelatedArray(row.related),
    };
  }

  private mapRegion(row: RawCatalogRow): PublicCatalogItemProjection['region'] {
    if (row.regionId === null && row.regionName === null && row.regionSlug === null) return null;
    if (!row.regionId || !row.regionName || !row.regionSlug) {
      throw new PublicCatalogRepositoryInvariantError('Incomplete public catalog region');
    }
    return { id: row.regionId, name: row.regionName, slug: row.regionSlug };
  }

  private mapTaxonomy(row: RawCatalogRow): PublicCatalogReferenceProjection | null {
    if (row.taxonomyId === null && row.taxonomyName === null && row.taxonomySlug === null)
      return null;
    if (!row.taxonomyId || !row.taxonomyName || !row.taxonomySlug) {
      throw new PublicCatalogRepositoryInvariantError('Incomplete public catalog taxonomy');
    }
    return {
      id: row.taxonomyId,
      name: row.taxonomyName,
      slug: row.taxonomySlug,
      icon: row.taxonomyIcon,
      category: row.taxonomyCategory,
      color: row.taxonomyColor,
      parentId: null,
      level: null,
      isUtility: row.taxonomyIsUtility,
    };
  }

  private mapOptionalMedia(value: unknown): PublicCatalogMediaSource | null {
    if (value === null) return null;
    return this.mapMedia(value);
  }

  private mapMediaArray(value: unknown): PublicCatalogMediaSource[] {
    if (!Array.isArray(value))
      throw new PublicCatalogRepositoryInvariantError('Invalid media collection');
    return value.map((item) => this.mapMedia(item));
  }

  private mapMedia(value: unknown): PublicCatalogMediaSource {
    if (typeof value !== 'object' || value === null) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public catalog media');
    }
    const raw = value as Record<string, unknown>;
    if (
      typeof raw.id !== 'string' ||
      (raw.storageProvider !== 'LOCAL' && raw.storageProvider !== 'CLOUDINARY') ||
      typeof raw.storageKey !== 'string' ||
      (raw.width !== null && typeof raw.width !== 'number') ||
      (raw.height !== null && typeof raw.height !== 'number') ||
      (raw.altText !== null && typeof raw.altText !== 'string')
    ) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public catalog media');
    }
    return {
      id: raw.id,
      storageProvider: raw.storageProvider,
      storageKey: raw.storageKey,
      width: raw.width as number | null,
      height: raw.height as number | null,
      altText: raw.altText as string | null,
    };
  }

  private mapReferenceArray(value: unknown): PublicCatalogReferenceProjection[] {
    if (!Array.isArray(value))
      throw new PublicCatalogRepositoryInvariantError('Invalid reference collection');
    return value.map((row) => this.mapReference(row as RawReferenceRow));
  }

  private mapReference(row: RawReferenceRow): PublicCatalogReferenceProjection {
    if (!row.id || !row.name || !row.slug) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public reference projection');
    }
    const level = row.level === null ? null : Number(row.level);
    if (level !== null && (!Number.isInteger(level) || level < 0 || level > 5)) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public reference level');
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      category: row.category,
      color: row.color,
      parentId: row.parentId,
      level,
      isUtility: row.isUtility,
    };
  }

  private mapContact(row: RawCatalogRow): PublicCatalogContactProjection | null {
    if (row.phoneE164 === null && row.zaloUrl === null && row.websiteUrl === null) return null;
    return { phoneE164: row.phoneE164, zaloUrl: row.zaloUrl, websiteUrl: row.websiteUrl };
  }

  private mapRelatedArray(value: unknown): PublicCatalogRelatedProjection[] {
    if (!Array.isArray(value)) {
      throw new PublicCatalogRepositoryInvariantError('Invalid related item collection');
    }
    return value.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new PublicCatalogRepositoryInvariantError('Invalid related item projection');
      }
      const raw = item as Record<string, unknown>;
      if (
        !['business', 'place', 'attraction', 'article', 'region'].includes(
          String(raw.entityType)
        ) ||
        typeof raw.id !== 'string' ||
        typeof raw.name !== 'string' ||
        typeof raw.slug !== 'string'
      ) {
        throw new PublicCatalogRepositoryInvariantError('Invalid related item projection');
      }
      return {
        entityType: raw.entityType as PublicCatalogRelatedProjection['entityType'],
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
      };
    });
  }

  private assertLocation(
    latitude: number,
    longitude: number
  ): { latitude: number; longitude: number } {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new PublicCatalogRepositoryInvariantError('Invalid public catalog location');
    }
    return { latitude, longitude };
  }

  private async executeRows<TRow extends Record<string, unknown>>(
    statement: SQL,
    operation: string
  ): Promise<TRow[]> {
    try {
      const result = await this.database.execute<TRow>(statement);
      return Array.from(result) as unknown as TRow[];
    } catch (error) {
      if (error instanceof PublicCatalogRepositoryInvariantError) throw error;
      throw new PublicCatalogRepositoryError(operation, error);
    }
  }
}
