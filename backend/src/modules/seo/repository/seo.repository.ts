import { type Database, db } from '@/lib/database/client';
import { articles } from '@/lib/database/schema/articles';
import { attractions } from '@/lib/database/schema/attractions';
import { businesses } from '@/lib/database/schema/businesses';
import { faqs, topListItems, topLists } from '@/lib/database/schema/faqs';
import { media, mediaVariants } from '@/lib/database/schema/media';
import { attractionCategories, businessTypes } from '@/lib/database/schema/references';
import { regions, touristPlaces } from '@/lib/database/schema/regions';
import { reviews } from '@/lib/database/schema/reviews';
import { articleTags, tags } from '@/lib/database/schema/tags';
import { userProfiles, users } from '@/lib/database/schema/users';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type {
  ISeoRepository,
  SeoArticleProjection,
  SeoAttractionProjection,
  SeoBusinessProjection,
  SeoFaqItem,
  SeoPlaceProjection,
  SeoRegionProjection,
  SeoTagProjection,
  SeoTopListProjection,
  SitemapItem,
} from './seo-repository.interface';

export class DrizzleSeoRepository implements ISeoRepository {
  constructor(private readonly database?: Database) {}

  private getClient() {
    return this.database ?? db;
  }

  public async findArticleBySlug(slug: string): Promise<SeoArticleProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        content: articles.content,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        authorFirstName: userProfiles.firstName,
        authorLastName: userProfiles.lastName,
        mediaId: media.id,
        mediaStorageProvider: media.storageProvider,
        mediaStorageKey: media.storageKey,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .leftJoin(
        media,
        and(eq(media.id, articles.thumbnailId), eq(media.status, 'READY'), isNull(media.deletedAt))
      )
      .where(
        and(
          eq(articles.slug, slug),
          eq(articles.status, 'published'),
          isNull(articles.deletedAt),
          sql`${articles.publishedAt} <= NOW()`
        )
      )
      .limit(1);

    if (!raw) return null;

    let mediaData: SeoArticleProjection['media'] = null;
    if (raw.mediaId && raw.mediaStorageProvider && raw.mediaStorageKey) {
      const dbVariants = await client
        .select({
          variantType: mediaVariants.variantType,
          storageKey: mediaVariants.storageKey,
        })
        .from(mediaVariants)
        .where(eq(mediaVariants.mediaId, raw.mediaId));

      mediaData = {
        storageProvider: raw.mediaStorageProvider,
        storageKey: raw.mediaStorageKey,
        variants: dbVariants.map((v) => ({
          variantName: v.variantType,
          storageKey: v.storageKey,
        })),
      };
    }

    return {
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      excerpt: raw.excerpt,
      content: raw.content,
      publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
      updatedAt: new Date(raw.updatedAt),
      authorName:
        raw.authorFirstName || raw.authorLastName
          ? `${raw.authorLastName || ''} ${raw.authorFirstName || ''}`.trim()
          : null,
      media: mediaData,
    };
  }

  public async findRegionBySlug(slug: string): Promise<SeoRegionProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: regions.id,
        name: regions.name,
        slug: regions.slug,
        level: regions.level,
        description: regions.description,
        latitude: regions.latitude,
        longitude: regions.longitude,
        path: regions.path,
        updatedAt: regions.updatedAt,
      })
      .from(regions)
      .where(and(eq(regions.slug, slug), isNull(regions.deletedAt)))
      .limit(1);

    if (!raw) return null;

    return {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      level: raw.level,
      description: raw.description,
      latitude: raw.latitude,
      longitude: raw.longitude,
      path: raw.path,
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async findPlaceBySlug(slug: string): Promise<SeoPlaceProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: touristPlaces.id,
        name: touristPlaces.name,
        slug: touristPlaces.slug,
        description: touristPlaces.description,
        coverUrl: touristPlaces.coverUrl,
        updatedAt: touristPlaces.updatedAt,
        locationText: sql<string>`ST_AsText(${touristPlaces.location})`,
        parentRegionSlug: regions.slug,
      })
      .from(touristPlaces)
      .innerJoin(regions, eq(touristPlaces.regionId, regions.id))
      .where(
        and(
          eq(touristPlaces.slug, slug),
          eq(touristPlaces.status, 'active'),
          isNull(touristPlaces.deletedAt),
          isNull(regions.deletedAt)
        )
      )
      .limit(1);

    if (!raw) return null;

    // Get media for PLACE
    const [mediaRaw] = await client
      .select({
        id: media.id,
        storageProvider: media.storageProvider,
        storageKey: media.storageKey,
      })
      .from(media)
      .where(
        and(
          eq(media.ownerType, 'PLACE'),
          eq(media.ownerId, raw.id),
          eq(media.status, 'READY'),
          isNull(media.deletedAt)
        )
      )
      .limit(1);

    let mediaData: SeoPlaceProjection['media'] = null;
    if (mediaRaw) {
      const dbVariants = await client
        .select({
          variantType: mediaVariants.variantType,
          storageKey: mediaVariants.storageKey,
        })
        .from(mediaVariants)
        .where(eq(mediaVariants.mediaId, mediaRaw.id));

      mediaData = {
        storageProvider: mediaRaw.storageProvider,
        storageKey: mediaRaw.storageKey,
        variants: dbVariants.map((v) => ({
          variantName: v.variantType,
          storageKey: v.storageKey,
        })),
      };
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (raw.locationText) {
      const match = raw.locationText.match(/POINT\(([^ ]+)\s+([^ ]+)\)/i);
      if (match) {
        longitude = Number.parseFloat(match[1] || '0');
        latitude = Number.parseFloat(match[2] || '0');
      }
    }

    return {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      coverUrl: raw.coverUrl,
      updatedAt: new Date(raw.updatedAt),
      latitude,
      longitude,
      parentRegion: raw.parentRegionSlug ? { slug: raw.parentRegionSlug } : null,
      media: mediaData,
    };
  }

  public async findBusinessBySlug(slug: string): Promise<SeoBusinessProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        description: businesses.description,
        coverUrl: businesses.coverUrl,
        priceMin: businesses.priceMin,
        priceMax: businesses.priceMax,
        businessTypeCode: businessTypes.code,
        updatedAt: businesses.updatedAt,
        locationText: sql<string>`ST_AsText(${businesses.location})`,
        parentRegionId: regions.id,
        parentRegionName: regions.name,
        parentRegionSlug: regions.slug,
        parentRegionPath: regions.path,
      })
      .from(businesses)
      .innerJoin(regions, eq(businesses.regionId, regions.id))
      .innerJoin(businessTypes, eq(businesses.businessTypeId, businessTypes.id))
      .where(
        and(
          eq(businesses.slug, slug),
          eq(businesses.status, 'active'),
          isNull(businesses.deletedAt),
          isNull(regions.deletedAt),
          eq(businessTypes.isActive, true)
        )
      )
      .limit(1);

    if (!raw) return null;

    // Get media for BUSINESS
    const [mediaRaw] = await client
      .select({
        id: media.id,
        storageProvider: media.storageProvider,
        storageKey: media.storageKey,
      })
      .from(media)
      .where(
        and(
          eq(media.ownerType, 'BUSINESS'),
          eq(media.ownerId, raw.id),
          eq(media.status, 'READY'),
          isNull(media.deletedAt)
        )
      )
      .limit(1);

    let mediaData: SeoBusinessProjection['media'] = null;
    if (mediaRaw) {
      const dbVariants = await client
        .select({
          variantType: mediaVariants.variantType,
          storageKey: mediaVariants.storageKey,
        })
        .from(mediaVariants)
        .where(eq(mediaVariants.mediaId, mediaRaw.id));

      mediaData = {
        storageProvider: mediaRaw.storageProvider,
        storageKey: mediaRaw.storageKey,
        variants: dbVariants.map((v) => ({
          variantName: v.variantType,
          storageKey: v.storageKey,
        })),
      };
    }

    // Ratings
    const [ratingsRaw] = await client
      .select({
        avgRating: sql<number>`AVG(${reviews.rating})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.ownerType, 'BUSINESS'),
          eq(reviews.ownerId, raw.id),
          eq(reviews.status, 'APPROVED'),
          isNull(reviews.deletedAt)
        )
      );

    const ratingValue = ratingsRaw?.avgRating ? Number(ratingsRaw.avgRating) : null;
    const reviewCount = ratingsRaw?.count ? Number(ratingsRaw.count) : 0;

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (raw.locationText) {
      const match = raw.locationText.match(/POINT\(([^ ]+)\s+([^ ]+)\)/i);
      if (match) {
        longitude = Number.parseFloat(match[1] || '0');
        latitude = Number.parseFloat(match[2] || '0');
      }
    }

    return {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      coverUrl: raw.coverUrl,
      priceMin: raw.priceMin,
      priceMax: raw.priceMax,
      businessTypeCode: raw.businessTypeCode,
      updatedAt: new Date(raw.updatedAt),
      latitude,
      longitude,
      parentRegion: raw.parentRegionId
        ? {
            id: raw.parentRegionId,
            name: raw.parentRegionName,
            slug: raw.parentRegionSlug,
            path: raw.parentRegionPath,
          }
        : null,
      media: mediaData,
      ratingValue,
      reviewCount,
    };
  }

  public async findAttractionBySlug(slug: string): Promise<SeoAttractionProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: attractions.id,
        name: attractions.name,
        slug: attractions.slug,
        description: attractions.description,
        coverUrl: attractions.coverUrl,
        updatedAt: attractions.updatedAt,
        locationText: sql<string>`ST_AsText(${attractions.location})`,
        isUtility: attractionCategories.isUtility,
        parentRegionSlug: regions.slug,
      })
      .from(attractions)
      .innerJoin(regions, eq(attractions.regionId, regions.id))
      .innerJoin(attractionCategories, eq(attractions.categoryId, attractionCategories.id))
      .where(
        and(
          eq(attractions.slug, slug),
          eq(attractions.status, 'active'),
          isNull(attractions.deletedAt),
          isNull(regions.deletedAt)
        )
      )
      .limit(1);

    if (!raw) return null;

    // Get media for ATTRACTION
    const [mediaRaw] = await client
      .select({
        id: media.id,
        storageProvider: media.storageProvider,
        storageKey: media.storageKey,
      })
      .from(media)
      .where(
        and(
          eq(media.ownerType, 'ATTRACTION'),
          eq(media.ownerId, raw.id),
          eq(media.status, 'READY'),
          isNull(media.deletedAt)
        )
      )
      .limit(1);

    let mediaData: SeoAttractionProjection['media'] = null;
    if (mediaRaw) {
      const dbVariants = await client
        .select({
          variantType: mediaVariants.variantType,
          storageKey: mediaVariants.storageKey,
        })
        .from(mediaVariants)
        .where(eq(mediaVariants.mediaId, mediaRaw.id));

      mediaData = {
        storageProvider: mediaRaw.storageProvider,
        storageKey: mediaRaw.storageKey,
        variants: dbVariants.map((v) => ({
          variantName: v.variantType,
          storageKey: v.storageKey,
        })),
      };
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (raw.locationText) {
      const match = raw.locationText.match(/POINT\(([^ ]+)\s+([^ ]+)\)/i);
      if (match) {
        longitude = Number.parseFloat(match[1] || '0');
        latitude = Number.parseFloat(match[2] || '0');
      }
    }

    return {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      coverUrl: raw.coverUrl,
      isUtility: raw.isUtility,
      updatedAt: new Date(raw.updatedAt),
      latitude,
      longitude,
      parentRegion: raw.parentRegionSlug ? { slug: raw.parentRegionSlug } : null,
      media: mediaData,
    };
  }

  public async findTagBySlug(slug: string): Promise<SeoTagProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        description: tags.description,
      })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (!raw) return null;

    // Check if tag has at least 1 public article
    const [checkArticle] = await client
      .select({ id: articles.id })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(
        and(
          eq(articleTags.tagId, raw.id),
          eq(articles.status, 'published'),
          isNull(articles.deletedAt),
          sql`${articles.publishedAt} <= NOW()`
        )
      )
      .limit(1);

    if (!checkArticle) return null;

    return raw;
  }

  public async findTopListBySlug(slug: string): Promise<SeoTopListProjection | null> {
    const client = this.getClient();
    const [raw] = await client
      .select({
        id: topLists.id,
        title: topLists.title,
        slug: topLists.slug,
        description: topLists.description,
        updatedAt: topLists.updatedAt,
      })
      .from(topLists)
      .where(
        and(eq(topLists.slug, slug), eq(topLists.status, 'PUBLISHED'), isNull(topLists.deletedAt))
      )
      .limit(1);

    if (!raw) return null;

    // Get all items
    const itemsRaw = await client
      .select({
        id: topListItems.id,
        topListId: topListItems.topListId,
        ownerType: topListItems.ownerType,
        ownerId: topListItems.ownerId,
        displayOrder: topListItems.displayOrder,
        updatedAt: topListItems.updatedAt,
      })
      .from(topListItems)
      .where(eq(topListItems.topListId, raw.id))
      .orderBy(topListItems.displayOrder);

    const projectedItems: SeoTopListProjection['items'] = [];

    // Batch resolve items to ensure no N+1
    const placeIds = itemsRaw.filter((i) => i.ownerType === 'PLACE').map((i) => i.ownerId);
    const businessIds = itemsRaw.filter((i) => i.ownerType === 'BUSINESS').map((i) => i.ownerId);
    const attractionIds = itemsRaw
      .filter((i) => i.ownerType === 'ATTRACTION')
      .map((i) => i.ownerId);

    const placesMap = new Map<
      string,
      { name: string; slug: string; coverUrl: string | null; updatedAt: Date }
    >();
    const businessesMap = new Map<
      string,
      { name: string; slug: string; coverUrl: string | null; updatedAt: Date }
    >();
    const attractionsMap = new Map<
      string,
      { name: string; slug: string; coverUrl: string | null; updatedAt: Date }
    >();

    if (placeIds.length > 0) {
      const rows = await client
        .select({
          id: touristPlaces.id,
          name: touristPlaces.name,
          slug: touristPlaces.slug,
          coverUrl: touristPlaces.coverUrl,
          updatedAt: touristPlaces.updatedAt,
        })
        .from(touristPlaces)
        .innerJoin(regions, eq(touristPlaces.regionId, regions.id))
        .where(
          and(
            inArray(touristPlaces.id, placeIds),
            eq(touristPlaces.status, 'active'),
            isNull(touristPlaces.deletedAt),
            isNull(regions.deletedAt)
          )
        );
      for (const r of rows) {
        placesMap.set(r.id, {
          name: r.name,
          slug: r.slug,
          coverUrl: r.coverUrl,
          updatedAt: new Date(r.updatedAt),
        });
      }
    }

    if (businessIds.length > 0) {
      const rows = await client
        .select({
          id: businesses.id,
          name: businesses.name,
          slug: businesses.slug,
          coverUrl: businesses.coverUrl,
          updatedAt: businesses.updatedAt,
        })
        .from(businesses)
        .innerJoin(regions, eq(businesses.regionId, regions.id))
        .innerJoin(businessTypes, eq(businesses.businessTypeId, businessTypes.id))
        .where(
          and(
            inArray(businesses.id, businessIds),
            eq(businesses.status, 'active'),
            isNull(businesses.deletedAt),
            isNull(regions.deletedAt),
            eq(businessTypes.isActive, true)
          )
        );
      for (const r of rows) {
        businessesMap.set(r.id, {
          name: r.name,
          slug: r.slug,
          coverUrl: r.coverUrl,
          updatedAt: new Date(r.updatedAt),
        });
      }
    }

    if (attractionIds.length > 0) {
      const rows = await client
        .select({
          id: attractions.id,
          name: attractions.name,
          slug: attractions.slug,
          coverUrl: attractions.coverUrl,
          updatedAt: attractions.updatedAt,
        })
        .from(attractions)
        .innerJoin(regions, eq(attractions.regionId, regions.id))
        .where(
          and(
            inArray(attractions.id, attractionIds),
            eq(attractions.status, 'active'),
            isNull(attractions.deletedAt),
            isNull(regions.deletedAt)
          )
        );
      for (const r of rows) {
        attractionsMap.set(r.id, {
          name: r.name,
          slug: r.slug,
          coverUrl: r.coverUrl,
          updatedAt: new Date(r.updatedAt),
        });
      }
    }

    // Now map items back in order
    let maxItemUpdatedAt = new Date(raw.updatedAt);
    let positionCounter = 1;

    // We also need media for the public owners
    const publicOwnerIds = [
      ...Array.from(placesMap.keys()),
      ...Array.from(businessesMap.keys()),
      ...Array.from(attractionsMap.keys()),
    ];

    const mediaMap = new Map<string, { id: string; storageProvider: string; storageKey: string }>();
    if (publicOwnerIds.length > 0) {
      const mediaRows = await client
        .select({
          id: media.id,
          storageProvider: media.storageProvider,
          storageKey: media.storageKey,
          ownerId: media.ownerId,
        })
        .from(media)
        .where(
          and(
            inArray(media.ownerId, publicOwnerIds),
            eq(media.status, 'READY'),
            isNull(media.deletedAt)
          )
        );
      for (const m of mediaRows) {
        if (m.ownerId) {
          mediaMap.set(m.ownerId, {
            id: m.id,
            storageProvider: m.storageProvider,
            storageKey: m.storageKey,
          });
        }
      }
    }

    // Get all variants for the media
    const mediaIds = Array.from(mediaMap.values()).map((m) => m.id);
    const variantsMap = new Map<string, Array<{ variantType: string; storageKey: string }>>();
    if (mediaIds.length > 0) {
      const variantRows = await client
        .select({
          mediaId: mediaVariants.mediaId,
          variantType: mediaVariants.variantType,
          storageKey: mediaVariants.storageKey,
        })
        .from(mediaVariants)
        .where(inArray(mediaVariants.mediaId, mediaIds));
      for (const v of variantRows) {
        const arr = variantsMap.get(v.mediaId) ?? [];
        arr.push({ variantType: v.variantType, storageKey: v.storageKey });
        variantsMap.set(v.mediaId, arr);
      }
    }

    for (const item of itemsRaw) {
      let resolved:
        | { name: string; slug: string; coverUrl: string | null; updatedAt: Date }
        | undefined;
      if (item.ownerType === 'PLACE') {
        resolved = placesMap.get(item.ownerId);
      } else if (item.ownerType === 'BUSINESS') {
        resolved = businessesMap.get(item.ownerId);
      } else if (item.ownerType === 'ATTRACTION') {
        resolved = attractionsMap.get(item.ownerId);
      }

      if (resolved) {
        if (resolved.updatedAt > maxItemUpdatedAt) {
          maxItemUpdatedAt = resolved.updatedAt;
        }
        if (new Date(item.updatedAt) > maxItemUpdatedAt) {
          maxItemUpdatedAt = new Date(item.updatedAt);
        }

        const itemMediaRaw = mediaMap.get(item.ownerId);
        let itemMediaData: {
          storageProvider: string;
          storageKey: string;
          variants: Array<{
            variantName: string;
            storageKey: string;
          }>;
        } | null = null;
        if (itemMediaRaw) {
          const itemVariants = variantsMap.get(itemMediaRaw.id) ?? [];
          itemMediaData = {
            storageProvider: itemMediaRaw.storageProvider,
            storageKey: itemMediaRaw.storageKey,
            variants: itemVariants.map((v) => ({
              variantName: v.variantType,
              storageKey: v.storageKey,
            })),
          };
        }

        projectedItems.push({
          position: positionCounter++,
          ownerType: item.ownerType as 'PLACE' | 'BUSINESS' | 'ATTRACTION',
          ownerId: item.ownerId,
          name: resolved.name,
          slug: resolved.slug,
          coverUrl: resolved.coverUrl,
          media: itemMediaData,
        });
      }
    }

    // Must contain at least one public owner item
    if (projectedItems.length === 0) return null;

    return {
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      description: raw.description,
      updatedAt: maxItemUpdatedAt,
      items: projectedItems,
    };
  }

  public async getFaqHubItems(): Promise<SeoFaqItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        question: faqs.question,
        answer: faqs.answer,
      })
      .from(faqs)
      .where(and(eq(faqs.status, 'PUBLISHED'), isNull(faqs.deletedAt)))
      .orderBy(faqs.displayOrder);

    return rows;
  }

  public async getSitemapArticles(): Promise<SitemapItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        slug: articles.slug,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          isNull(articles.deletedAt),
          sql`${articles.publishedAt} <= NOW()`
        )
      );

    return rows.map((r) => ({
      path: `/cam-nang/${r.slug}`,
      lastmod: new Date(r.updatedAt),
    }));
  }

  public async getSitemapRegions(): Promise<SitemapItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        slug: regions.slug,
        updatedAt: regions.updatedAt,
      })
      .from(regions)
      .where(and(isNull(regions.deletedAt), inArray(regions.level, [1, 2, 3])));

    return rows.map((r) => ({
      path: `/khu-vuc/${r.slug}`,
      lastmod: new Date(r.updatedAt),
    }));
  }

  public async getSitemapPlaces(): Promise<SitemapItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        slug: touristPlaces.slug,
        updatedAt: touristPlaces.updatedAt,
      })
      .from(touristPlaces)
      .innerJoin(regions, eq(touristPlaces.regionId, regions.id))
      .where(
        and(
          eq(touristPlaces.status, 'active'),
          isNull(touristPlaces.deletedAt),
          isNull(regions.deletedAt)
        )
      );

    return rows.map((r) => ({
      path: `/dia-diem/${r.slug}`,
      lastmod: new Date(r.updatedAt),
    }));
  }

  public async getSitemapBusinesses(): Promise<SitemapItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        slug: businesses.slug,
        updatedAt: businesses.updatedAt,
      })
      .from(businesses)
      .innerJoin(regions, eq(businesses.regionId, regions.id))
      .innerJoin(businessTypes, eq(businesses.businessTypeId, businessTypes.id))
      .where(
        and(
          eq(businesses.status, 'active'),
          isNull(businesses.deletedAt),
          isNull(regions.deletedAt),
          eq(businessTypes.isActive, true)
        )
      );

    return rows.map((r) => ({
      path: `/co-so/${r.slug}`,
      lastmod: new Date(r.updatedAt),
    }));
  }

  public async getSitemapAttractions(): Promise<SitemapItem[]> {
    const client = this.getClient();
    const rows = await client
      .select({
        slug: attractions.slug,
        updatedAt: attractions.updatedAt,
      })
      .from(attractions)
      .innerJoin(regions, eq(attractions.regionId, regions.id))
      .where(
        and(
          eq(attractions.status, 'active'),
          isNull(attractions.deletedAt),
          isNull(regions.deletedAt)
        )
      );

    return rows.map((r) => ({
      path: `/tien-ich/${r.slug}`,
      lastmod: new Date(r.updatedAt),
    }));
  }

  public async getSitemapTags(): Promise<SitemapItem[]> {
    const client = this.getClient();
    // Distinct tag IDs having at least 1 public article
    const rows = await client
      .select({
        slug: tags.slug,
      })
      .from(tags)
      .innerJoin(articleTags, eq(articleTags.tagId, tags.id))
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(
        and(
          eq(articles.status, 'published'),
          isNull(articles.deletedAt),
          sql`${articles.publishedAt} <= NOW()`
        )
      )
      .groupBy(tags.slug);

    return rows.map((r) => ({
      path: `/tag/${r.slug}`,
      lastmod: null, // Tag does not use lastmod
    }));
  }

  public async getSitemapTopLists(): Promise<SitemapItem[]> {
    const client = this.getClient();
    // In sitemap, we must fetch eligible top lists
    const tlists = await client
      .select({
        id: topLists.id,
        slug: topLists.slug,
        updatedAt: topLists.updatedAt,
      })
      .from(topLists)
      .where(and(eq(topLists.status, 'PUBLISHED'), isNull(topLists.deletedAt)));

    const sitemapItems: SitemapItem[] = [];

    // Query top list items in a single batch
    if (tlists.length > 0) {
      const listIds = tlists.map((t) => t.id);
      const allItems = await client
        .select({
          id: topListItems.id,
          topListId: topListItems.topListId,
          ownerType: topListItems.ownerType,
          ownerId: topListItems.ownerId,
          updatedAt: topListItems.updatedAt,
        })
        .from(topListItems)
        .where(inArray(topListItems.topListId, listIds));

      // Group items by topListId
      const itemsByList = new Map<string, typeof allItems>();
      for (const item of allItems) {
        const arr = itemsByList.get(item.topListId) ?? [];
        arr.push(item);
        itemsByList.set(item.topListId, arr);
      }

      // Collect all owner IDs to resolve public status
      const placeIds = allItems.filter((i) => i.ownerType === 'PLACE').map((i) => i.ownerId);
      const businessIds = allItems.filter((i) => i.ownerType === 'BUSINESS').map((i) => i.ownerId);
      const attractionIds = allItems
        .filter((i) => i.ownerType === 'ATTRACTION')
        .map((i) => i.ownerId);

      const activePlaces = new Set<string>();
      const activeBusinesses = new Set<string>();
      const activeAttractions = new Set<string>();

      const ownerUpdatedAtMap = new Map<string, Date>();

      if (placeIds.length > 0) {
        const rows = await client
          .select({ id: touristPlaces.id, updatedAt: touristPlaces.updatedAt })
          .from(touristPlaces)
          .innerJoin(regions, eq(touristPlaces.regionId, regions.id))
          .where(
            and(
              inArray(touristPlaces.id, placeIds),
              eq(touristPlaces.status, 'active'),
              isNull(touristPlaces.deletedAt),
              isNull(regions.deletedAt)
            )
          );
        for (const r of rows) {
          activePlaces.add(r.id);
          ownerUpdatedAtMap.set(r.id, new Date(r.updatedAt));
        }
      }

      if (businessIds.length > 0) {
        const rows = await client
          .select({ id: businesses.id, updatedAt: businesses.updatedAt })
          .from(businesses)
          .innerJoin(regions, eq(businesses.regionId, regions.id))
          .innerJoin(businessTypes, eq(businesses.businessTypeId, businessTypes.id))
          .where(
            and(
              inArray(businesses.id, businessIds),
              eq(businesses.status, 'active'),
              isNull(businesses.deletedAt),
              isNull(regions.deletedAt),
              eq(businessTypes.isActive, true)
            )
          );
        for (const r of rows) {
          activeBusinesses.add(r.id);
          ownerUpdatedAtMap.set(r.id, new Date(r.updatedAt));
        }
      }

      if (attractionIds.length > 0) {
        const rows = await client
          .select({ id: attractions.id, updatedAt: attractions.updatedAt })
          .from(attractions)
          .innerJoin(regions, eq(attractions.regionId, regions.id))
          .where(
            and(
              inArray(attractions.id, attractionIds),
              eq(attractions.status, 'active'),
              isNull(attractions.deletedAt),
              isNull(regions.deletedAt)
            )
          );
        for (const r of rows) {
          activeAttractions.add(r.id);
          ownerUpdatedAtMap.set(r.id, new Date(r.updatedAt));
        }
      }

      for (const list of tlists) {
        const listItems = itemsByList.get(list.id) ?? [];
        let publicItemCount = 0;
        let maxUpdatedAt = new Date(list.updatedAt);

        for (const item of listItems) {
          let isActive = false;
          if (item.ownerType === 'PLACE') isActive = activePlaces.has(item.ownerId);
          else if (item.ownerType === 'BUSINESS') isActive = activeBusinesses.has(item.ownerId);
          else if (item.ownerType === 'ATTRACTION') isActive = activeAttractions.has(item.ownerId);

          if (isActive) {
            publicItemCount++;
            const ownerUpdate = ownerUpdatedAtMap.get(item.ownerId);
            if (ownerUpdate && ownerUpdate > maxUpdatedAt) {
              maxUpdatedAt = ownerUpdate;
            }
            const itemUpdate = new Date(item.updatedAt);
            if (itemUpdate > maxUpdatedAt) {
              maxUpdatedAt = itemUpdate;
            }
          }
        }

        if (publicItemCount > 0) {
          sitemapItems.push({
            path: `/top/${list.slug}`,
            lastmod: maxUpdatedAt,
          });
        }
      }
    }

    return sitemapItems;
  }

  public async checkFaqHubEligibility(): Promise<boolean> {
    const client = this.getClient();
    const [row] = await client
      .select({ id: faqs.id })
      .from(faqs)
      .where(and(eq(faqs.status, 'PUBLISHED'), isNull(faqs.deletedAt)))
      .limit(1);

    return !!row;
  }

  public async resolveRegionPathBySlugs(slugs: string[]): Promise<SeoRegionProjection[]> {
    if (slugs.length === 0) return [];
    const client = this.getClient();
    const rows = await client
      .select({
        id: regions.id,
        name: regions.name,
        slug: regions.slug,
        level: regions.level,
        description: regions.description,
        latitude: regions.latitude,
        longitude: regions.longitude,
        path: regions.path,
        updatedAt: regions.updatedAt,
      })
      .from(regions)
      .where(and(inArray(regions.slug, slugs), isNull(regions.deletedAt)));

    const map = new Map(rows.map((r) => [r.slug, r]));
    const ordered: SeoRegionProjection[] = [];
    for (const slug of slugs) {
      const r = map.get(slug);
      if (r) {
        ordered.push({
          id: r.id,
          name: r.name,
          slug: r.slug,
          level: r.level,
          description: r.description,
          latitude: r.latitude,
          longitude: r.longitude,
          path: r.path,
          updatedAt: new Date(r.updatedAt),
        });
      }
    }
    return ordered;
  }
}
