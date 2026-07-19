export interface SitemapItem {
  path: string;
  lastmod: Date | null;
}

export interface SeoArticleProjection {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date;
  updatedAt: Date;
  authorName: string | null;
  media: {
    storageProvider: string;
    storageKey: string;
    variants: Array<{
      variantName: string;
      storageKey: string;
    }>;
  } | null;
}

export interface SeoRegionProjection {
  id: string;
  name: string;
  slug: string;
  level: number;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  path: string;
  updatedAt: Date;
}

export interface SeoPlaceProjection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
  parentRegion: {
    slug: string;
  } | null;
  media: {
    storageProvider: string;
    storageKey: string;
    variants: Array<{
      variantName: string;
      storageKey: string;
    }>;
  } | null;
}

export interface SeoBusinessProjection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  priceMin: string | null;
  priceMax: string | null;
  businessTypeCode: string;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
  parentRegion: {
    id: string;
    name: string;
    slug: string;
    path: string;
  } | null;
  media: {
    storageProvider: string;
    storageKey: string;
    variants: Array<{
      variantName: string;
      storageKey: string;
    }>;
  } | null;
  ratingValue: number | null;
  reviewCount: number;
}

export interface SeoAttractionProjection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isUtility: boolean;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
  parentRegion: {
    slug: string;
  } | null;
  media: {
    storageProvider: string;
    storageKey: string;
    variants: Array<{
      variantName: string;
      storageKey: string;
    }>;
  } | null;
}

export interface SeoTagProjection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface SeoTopListProjection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  updatedAt: Date;
  items: Array<{
    position: number;
    ownerType: 'PLACE' | 'BUSINESS' | 'ATTRACTION';
    ownerId: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    media: {
      storageProvider: string;
      storageKey: string;
      variants: Array<{
        variantName: string;
        storageKey: string;
      }>;
    } | null;
  }>;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface ISeoRepository {
  findArticleBySlug(slug: string): Promise<SeoArticleProjection | null>;
  findRegionBySlug(slug: string): Promise<SeoRegionProjection | null>;
  findPlaceBySlug(slug: string): Promise<SeoPlaceProjection | null>;
  findBusinessBySlug(slug: string): Promise<SeoBusinessProjection | null>;
  findAttractionBySlug(slug: string): Promise<SeoAttractionProjection | null>;
  findTagBySlug(slug: string): Promise<SeoTagProjection | null>;
  findTopListBySlug(slug: string): Promise<SeoTopListProjection | null>;
  getFaqHubItems(): Promise<SeoFaqItem[]>;

  getSitemapArticles(): Promise<SitemapItem[]>;
  getSitemapRegions(): Promise<SitemapItem[]>;
  getSitemapPlaces(): Promise<SitemapItem[]>;
  getSitemapBusinesses(): Promise<SitemapItem[]>;
  getSitemapAttractions(): Promise<SitemapItem[]>;
  getSitemapTags(): Promise<SitemapItem[]>;
  getSitemapTopLists(): Promise<SitemapItem[]>;
  checkFaqHubEligibility(): Promise<boolean>;
  resolveRegionPathBySlugs(slugs: string[]): Promise<SeoRegionProjection[]>;
}
