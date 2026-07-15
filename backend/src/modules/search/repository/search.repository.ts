import { type Database, db } from '@/lib/database/client';
import type { SQL } from 'drizzle-orm';
import {
  SEARCH_ENTITY_ORDER,
  SEARCH_ENTITY_TYPES,
  type SearchBusinessTypeReferenceStatus,
  type SearchCategoryProjection,
  type SearchEntityOrder,
  type SearchEntityType,
  type SearchKeyset,
  type SearchQueryInspection,
  type SearchReadProjection,
  type SearchReferenceFilter,
  type SearchReferenceValidation,
  type SearchRegionProjection,
  type SearchRegionReferenceStatus,
  type SearchRepositoryPage,
  type SearchRepositoryQuery,
} from './search-read-model';
import type { ISearchRepository } from './search-repository.interface';
import {
  buildReferenceValidationSql,
  buildSearchQueryInspectionSql,
  buildUnifiedSearchSql,
} from './search-sql.fragments';

interface SearchInspectionRow extends Record<string, unknown> {
  lexemeCount: number;
}

interface SearchReferenceValidationRow extends Record<string, unknown> {
  region: SearchRegionReferenceStatus;
  articleCategoryExists: boolean | null;
  attractionCategoryExists: boolean | null;
  businessType: SearchBusinessTypeReferenceStatus;
  foundAmenityIds: string[];
  missingAmenityIds: string[];
}

interface SearchRawRow extends Record<string, unknown> {
  entityType: string;
  entityOrder: number;
  id: string;
  name: string;
  slug: string;
  summarySource: string | null;
  thumbnailCandidate: string | null;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  rating: string | number | null;
  priceMin: string | number | null;
  priceMax: string | number | null;
  relevance: number | null;
  newestCursorValue: string | null;
  rawRating: string | number | null;
  priceCursorValue: string | number | null;
}

export type SearchSqlBuilder = (query: SearchRepositoryQuery) => SQL | null;

export class SearchRepositoryOperationError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Search repository ${operation} failed`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = 'SearchRepositoryOperationError';
  }
}

class SearchRepositoryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchRepositoryInvariantError';
  }
}

function isSearchEntityType(value: string): value is SearchEntityType {
  return (SEARCH_ENTITY_TYPES as readonly string[]).includes(value);
}

function toExactNumericText(value: string | number | null): string | null {
  if (value === null) return null;
  return typeof value === 'string' ? value : String(value);
}

function mapRegion(row: SearchRawRow): SearchRegionProjection | null {
  if (row.regionId === null) return null;
  if (row.regionName === null || row.regionSlug === null) {
    throw new SearchRepositoryInvariantError('Search region projection is incomplete');
  }
  return { id: row.regionId, name: row.regionName, slug: row.regionSlug };
}

function mapCategory(row: SearchRawRow): SearchCategoryProjection | null {
  if (row.categoryId === null) return null;
  if (row.categoryCode === null || row.categoryName === null) {
    throw new SearchRepositoryInvariantError('Search category projection is incomplete');
  }
  return { id: row.categoryId, code: row.categoryCode, name: row.categoryName };
}

function getSortValue(
  row: SearchRawRow,
  sort: SearchRepositoryQuery['sort']
): number | string | null {
  switch (sort) {
    case 'relevance':
      if (row.relevance === null) {
        throw new SearchRepositoryInvariantError('Relevance sort returned a null rank');
      }
      return row.relevance;
    case 'newest':
      return row.newestCursorValue;
    case 'rating':
      return toExactNumericText(row.rawRating);
    case 'price_asc':
    case 'price_desc':
      return toExactNumericText(row.priceCursorValue);
  }
}

function mapProjection(row: SearchRawRow, query: SearchRepositoryQuery): SearchReadProjection {
  if (!isSearchEntityType(row.entityType)) {
    throw new SearchRepositoryInvariantError('Search query returned an unknown entity type');
  }
  const expectedOrder = SEARCH_ENTITY_ORDER[row.entityType];
  if (row.entityOrder !== expectedOrder) {
    throw new SearchRepositoryInvariantError('Search query returned an invalid entity order');
  }

  return {
    entityType: row.entityType,
    entityOrder: row.entityOrder as SearchEntityOrder,
    id: row.id,
    name: row.name,
    slug: row.slug,
    summarySource: row.summarySource,
    thumbnailCandidate: row.thumbnailCandidate,
    region: mapRegion(row),
    category: mapCategory(row),
    rating: toExactNumericText(row.rating),
    priceMin: toExactNumericText(row.priceMin),
    priceMax: toExactNumericText(row.priceMax),
    relevance: query.q === null ? null : row.relevance,
    sortValue: getSortValue(row, query.sort),
  };
}

function makeLastKeyset(
  query: SearchRepositoryQuery,
  item: SearchReadProjection | undefined
): SearchKeyset | null {
  if (!item) return null;

  const base = { entityType: item.entityType, id: item.id };
  switch (query.sort) {
    case 'relevance':
      if (typeof item.sortValue !== 'number') {
        throw new SearchRepositoryInvariantError('Invalid relevance keyset value');
      }
      return { ...base, sort: 'relevance', sortValue: item.sortValue };
    case 'newest':
      if (typeof item.sortValue !== 'string' && item.sortValue !== null) {
        throw new SearchRepositoryInvariantError('Invalid newest keyset value');
      }
      return { ...base, sort: 'newest', sortValue: item.sortValue };
    case 'rating':
      if (typeof item.sortValue !== 'string' && item.sortValue !== null) {
        throw new SearchRepositoryInvariantError('Invalid rating keyset value');
      }
      return { ...base, sort: 'rating', sortValue: item.sortValue };
    case 'price_asc':
    case 'price_desc':
      if (typeof item.sortValue !== 'string' && item.sortValue !== null) {
        throw new SearchRepositoryInvariantError('Invalid price keyset value');
      }
      return { ...base, sort: query.sort, sortValue: item.sortValue };
  }
}

function validateRepositoryQuery(query: SearchRepositoryQuery): void {
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 50) {
    throw new SearchRepositoryInvariantError('Search repository limit must be between 1 and 50');
  }
  if (query.types.length === 0) {
    throw new SearchRepositoryInvariantError('Search repository requires at least one entity type');
  }
  if (query.sort === 'relevance' && query.q === null) {
    throw new SearchRepositoryInvariantError('Relevance sort requires a search query');
  }
  if (query.keyset && query.keyset.sort !== query.sort) {
    throw new SearchRepositoryInvariantError('Search keyset sort does not match the query sort');
  }
}

function emptyReferenceValidation(filters: SearchReferenceFilter): SearchReferenceValidation {
  return {
    region: 'not_requested',
    articleCategoryExists: null,
    attractionCategoryExists: null,
    businessType: 'not_requested',
    requestedAmenityIds: filters.amenityIds,
    foundAmenityIds: [],
    missingAmenityIds: [],
    allAmenitiesExist: true,
  };
}

export class DrizzleSearchRepository implements ISearchRepository {
  constructor(
    private readonly database: Database = db,
    private readonly buildSearchSql: SearchSqlBuilder = buildUnifiedSearchSql
  ) {}

  private async executeRows<TRow extends Record<string, unknown>>(query: SQL): Promise<TRow[]> {
    const result = await this.database.execute<TRow>(query);
    return Array.from(result) as unknown as TRow[];
  }

  async inspectQuery(q: string): Promise<SearchQueryInspection> {
    try {
      const rows = await this.executeRows<SearchInspectionRow>(buildSearchQueryInspectionSql(q));
      const lexemeCount = rows[0]?.lexemeCount;
      if (typeof lexemeCount !== 'number') {
        throw new SearchRepositoryInvariantError('Search query inspection returned no result');
      }
      return { lexemeCount, hasLexemes: lexemeCount > 0 };
    } catch (error) {
      if (error instanceof SearchRepositoryInvariantError) throw error;
      throw new SearchRepositoryOperationError('query inspection', error);
    }
  }

  async validateReferences(filters: SearchReferenceFilter): Promise<SearchReferenceValidation> {
    const hasReferences =
      filters.regionId !== null ||
      filters.articleCategoryId !== null ||
      filters.attractionCategoryId !== null ||
      filters.businessTypeId !== null ||
      filters.amenityIds.length > 0;
    if (!hasReferences) return emptyReferenceValidation(filters);

    try {
      const rows = await this.executeRows<SearchReferenceValidationRow>(
        buildReferenceValidationSql(filters)
      );
      const row = rows[0];
      if (!row) {
        throw new SearchRepositoryInvariantError('Search reference validation returned no result');
      }

      return {
        region: row.region,
        articleCategoryExists: row.articleCategoryExists,
        attractionCategoryExists: row.attractionCategoryExists,
        businessType: row.businessType,
        requestedAmenityIds: filters.amenityIds,
        foundAmenityIds: row.foundAmenityIds,
        missingAmenityIds: row.missingAmenityIds,
        allAmenitiesExist: row.missingAmenityIds.length === 0,
      };
    } catch (error) {
      if (error instanceof SearchRepositoryInvariantError) throw error;
      throw new SearchRepositoryOperationError('reference validation', error);
    }
  }

  async search(query: SearchRepositoryQuery): Promise<SearchRepositoryPage> {
    validateRepositoryQuery(query);
    const statement = this.buildSearchSql(query);
    if (!statement) return { items: [], hasMore: false, lastKeyset: null };

    try {
      const rows = await this.executeRows<SearchRawRow>(statement);
      const hasMore = rows.length > query.limit;
      const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
      const items = pageRows.map((row) => mapProjection(row, query));

      return {
        items,
        hasMore,
        lastKeyset: makeLastKeyset(query, items.at(-1)),
      };
    } catch (error) {
      if (error instanceof SearchRepositoryInvariantError) throw error;
      throw new SearchRepositoryOperationError('unified search', error);
    }
  }
}
