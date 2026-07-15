export const SEARCH_ENTITY_TYPES = ['article', 'attraction', 'business', 'place'] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export const SEARCH_SORTS = ['relevance', 'newest', 'rating', 'price_asc', 'price_desc'] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_ENTITY_ORDER = {
  article: 1,
  attraction: 2,
  business: 3,
  place: 4,
} as const satisfies Record<SearchEntityType, 1 | 2 | 3 | 4>;

export type SearchEntityOrder = (typeof SEARCH_ENTITY_ORDER)[SearchEntityType];

interface SearchKeysetBase {
  readonly entityType: SearchEntityType;
  readonly id: string;
}

export type SearchKeyset =
  | (SearchKeysetBase & {
      readonly sort: 'relevance';
      readonly sortValue: number;
    })
  | (SearchKeysetBase & {
      readonly sort: 'newest';
      /** Exact PostgreSQL TIMESTAMPTZ text returned by the repository. */
      readonly sortValue: string | null;
    })
  | (SearchKeysetBase & {
      readonly sort: 'rating';
      /** Exact PostgreSQL NUMERIC representation. Never pass a rounded display value here. */
      readonly sortValue: string | null;
    })
  | (SearchKeysetBase & {
      readonly sort: 'price_asc' | 'price_desc';
      /** Exact PostgreSQL NUMERIC representation. Never pass a JavaScript float here. */
      readonly sortValue: string | null;
    });

/**
 * Normalized, structurally validated input for the repository boundary.
 *
 * The Application layer owns public DTO validation and opaque cursor verification. The
 * repository receives only a decoded keyset and never receives the public cursor string.
 */
export interface SearchRepositoryQuery {
  readonly q: string | null;
  readonly types: readonly SearchEntityType[];
  readonly regionId: string | null;
  readonly includeDescendants: boolean;
  readonly articleCategoryId: string | null;
  readonly attractionCategoryId: string | null;
  readonly businessTypeId: string | null;
  /** Exact validated decimal representation in the public range 1..5. */
  readonly minRating: string | null;
  /** Exact validated NUMERIC(12,2) request values in fixed VND currency. */
  readonly priceMin: string | null;
  readonly priceMax: string | null;
  readonly amenityIds: readonly string[];
  readonly sort: SearchSort;
  readonly keyset: SearchKeyset | null;
  readonly limit: number;
}

export type SearchReferenceFilter = Pick<
  SearchRepositoryQuery,
  'regionId' | 'articleCategoryId' | 'attractionCategoryId' | 'businessTypeId' | 'amenityIds'
>;

export interface SearchRegionProjection {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface SearchCategoryProjection {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

/**
 * Internal read projection. `summarySource` is intentionally not called `summary`: it may
 * contain source markup and must be sanitized/truncated by the future SearchService mapper.
 */
export interface SearchReadProjection {
  readonly entityType: SearchEntityType;
  readonly entityOrder: SearchEntityOrder;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly summarySource: string | null;
  /** Public-facing source candidate. The Service mapper must fail closed unless it is HTTPS. */
  readonly thumbnailCandidate: string | null;
  readonly region: SearchRegionProjection | null;
  readonly category: SearchCategoryProjection | null;
  /** Rounded display projection (maximum two decimals), represented exactly as NUMERIC text. */
  readonly rating: string | null;
  readonly priceMin: string | null;
  readonly priceMax: string | null;
  readonly relevance: number | null;
  /** Exact primary sort value used to construct the next decoded keyset. */
  readonly sortValue: number | string | null;
}

export interface SearchRepositoryPage {
  readonly items: readonly SearchReadProjection[];
  readonly hasMore: boolean;
  readonly lastKeyset: SearchKeyset | null;
}

export interface SearchQueryInspection {
  readonly hasLexemes: boolean;
  readonly lexemeCount: number;
}

export type SearchRegionReferenceStatus = 'not_requested' | 'valid' | 'missing' | 'deleted';

export type SearchBusinessTypeReferenceStatus = 'not_requested' | 'valid' | 'missing' | 'inactive';

export interface SearchReferenceValidation {
  readonly region: SearchRegionReferenceStatus;
  readonly articleCategoryExists: boolean | null;
  readonly attractionCategoryExists: boolean | null;
  readonly businessType: SearchBusinessTypeReferenceStatus;
  readonly requestedAmenityIds: readonly string[];
  readonly foundAmenityIds: readonly string[];
  readonly missingAmenityIds: readonly string[];
  readonly allAmenitiesExist: boolean;
}
