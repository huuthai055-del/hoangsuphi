export const PUBLIC_CATALOG_KINDS = [
  'businesses',
  'places',
  'attractions',
  'articles',
  'regions',
] as const;

export type PublicCatalogKind = (typeof PUBLIC_CATALOG_KINDS)[number];
export type PublicCatalogEntityType = 'business' | 'place' | 'attraction' | 'article' | 'region';
export type PublicCatalogSort = 'newest' | 'name';

export const PUBLIC_REFERENCE_KINDS = [
  'business-types',
  'amenities',
  'article-categories',
  'attraction-categories',
  'regions',
] as const;

export type PublicReferenceKind = (typeof PUBLIC_REFERENCE_KINDS)[number];

export interface PublicCatalogCursorKeyset {
  sort: PublicCatalogSort;
  sortTimestamp: Date | null;
  nameKey: string;
  id: string;
}

export interface PublicCatalogListQuery {
  kind: PublicCatalogKind;
  limit: number;
  cursor: string | null;
  sort: PublicCatalogSort;
  regionSlug: string | null;
  businessTypeSlug: string | null;
  categorySlug: string | null;
  amenitySlugs: string[];
  parentRegionSlug: string | null;
}

export interface PublicCatalogRegionProjection {
  id: string;
  name: string;
  slug: string;
}

export interface PublicCatalogReferenceProjection {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  category: string | null;
  color: string | null;
  parentId: string | null;
  level: number | null;
  isUtility: boolean | null;
}

export interface PublicCatalogMediaSource {
  id: string;
  storageProvider: 'LOCAL' | 'CLOUDINARY';
  storageKey: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

export interface PublicCatalogRatingProjection {
  average: string | null;
  count: number;
}

export interface PublicCatalogContactProjection {
  phoneE164: string | null;
  zaloUrl: string | null;
  websiteUrl: string | null;
}

export interface PublicCatalogRelatedProjection {
  entityType: PublicCatalogEntityType;
  id: string;
  name: string;
  slug: string;
}

export interface PublicCatalogItemProjection {
  entityType: PublicCatalogEntityType;
  id: string;
  name: string;
  slug: string;
  summarySource: string | null;
  updatedAt: Date;
  nameKey: string;
  region: PublicCatalogRegionProjection | null;
  taxonomy: PublicCatalogReferenceProjection | null;
  image: PublicCatalogMediaSource | null;
  coverUrlCandidate: string | null;
  rating: PublicCatalogRatingProjection;
  priceMin: string | null;
  priceMax: string | null;
}

export interface PublicCatalogLocationProjection {
  latitude: number;
  longitude: number;
}

export interface PublicCatalogDetailProjection extends PublicCatalogItemProjection {
  descriptionSource: string | null;
  contentSource: string | null;
  location: PublicCatalogLocationProjection | null;
  media: PublicCatalogMediaSource[];
  amenities: PublicCatalogReferenceProjection[];
  contact: PublicCatalogContactProjection | null;
  related: PublicCatalogRelatedProjection[];
}

export interface PublicCatalogPageCriteria extends PublicCatalogListQuery {
  after: PublicCatalogCursorKeyset | null;
}

export interface IPublicCatalogRepository {
  findPage(criteria: PublicCatalogPageCriteria): Promise<PublicCatalogItemProjection[]>;
  findDetail(kind: PublicCatalogKind, slug: string): Promise<PublicCatalogDetailProjection | null>;
  listReferences(kind: PublicReferenceKind): Promise<PublicCatalogReferenceProjection[]>;
}
