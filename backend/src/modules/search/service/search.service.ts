import { ValidationError } from '@/common/errors/http.errors';
import type { SearchQueryDto, SearchResponseDto } from '../dto/search.dto';
import type {
  SearchReferenceValidation,
  SearchRepositoryQuery,
} from '../repository/search-read-model';
import type { ISearchRepository } from '../repository/search-repository.interface';
import type { ISearchCursorCodec } from './search-cursor';
import { mapSearchProjection } from './search-result.mapper';

class SearchServiceInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchServiceInvariantError';
  }
}

function assertValidReferences(validation: SearchReferenceValidation): void {
  const invalidParams: Record<string, string> = {};

  if (validation.region === 'missing') {
    invalidParams.regionId = 'Region does not exist';
  } else if (validation.region === 'deleted') {
    invalidParams.regionId = 'Region is not publicly available';
  }
  if (validation.articleCategoryExists === false) {
    invalidParams.articleCategoryId = 'Article Category does not exist';
  }
  if (validation.attractionCategoryExists === false) {
    invalidParams.attractionCategoryId = 'Attraction Category does not exist';
  }
  if (validation.businessType === 'missing') {
    invalidParams.businessTypeId = 'Business Type does not exist';
  } else if (validation.businessType === 'inactive') {
    invalidParams.businessTypeId = 'Business Type is inactive';
  }
  if (!validation.allAmenitiesExist) {
    invalidParams.amenityIds = `Unknown Amenity IDs: ${validation.missingAmenityIds.join(',')}`;
  }

  if (Object.keys(invalidParams).length > 0) {
    throw new ValidationError('Invalid search parameters', invalidParams);
  }
}

function toRepositoryQuery(
  query: SearchQueryDto,
  keyset: SearchRepositoryQuery['keyset']
): SearchRepositoryQuery {
  return {
    q: query.q,
    types: query.types,
    regionId: query.regionId,
    includeDescendants: query.includeDescendants,
    articleCategoryId: query.articleCategoryId,
    attractionCategoryId: query.attractionCategoryId,
    businessTypeId: query.businessTypeId,
    minRating: query.minRating,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    amenityIds: query.amenityIds,
    sort: query.sort,
    keyset,
    limit: query.limit,
  };
}

export class SearchService {
  constructor(
    private readonly repository: ISearchRepository,
    private readonly cursorCodec: ISearchCursorCodec
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const fingerprint = this.cursorCodec.fingerprint(query);
    const keyset =
      query.cursor === null ? null : this.cursorCodec.decode(query.cursor, fingerprint);
    if (query.cursor !== null && keyset === null) {
      throw new ValidationError('Invalid search parameters', {
        cursor: 'Cursor is malformed, tampered, unsupported, or does not match this request',
      });
    }
    if (keyset !== null && keyset.sort !== query.sort) {
      throw new ValidationError('Invalid search parameters', {
        cursor: 'Cursor sort does not match this request',
      });
    }

    if (query.q !== null) {
      const inspection = await this.repository.inspectQuery(query.q);
      if (!inspection.hasLexemes) {
        throw new ValidationError('Invalid search parameters', {
          q: 'Query must contain at least one searchable term',
        });
      }
    }

    const references = await this.repository.validateReferences({
      regionId: query.regionId,
      articleCategoryId: query.articleCategoryId,
      attractionCategoryId: query.attractionCategoryId,
      businessTypeId: query.businessTypeId,
      amenityIds: query.amenityIds,
    });
    assertValidReferences(references);

    const page = await this.repository.search(toRepositoryQuery(query, keyset));
    if (page.hasMore && page.lastKeyset === null) {
      throw new SearchServiceInvariantError('Search page with more results must have a keyset');
    }
    if (page.lastKeyset !== null && page.lastKeyset.sort !== query.sort) {
      throw new SearchServiceInvariantError('Search page keyset sort does not match the request');
    }

    const data = page.items.map(mapSearchProjection);
    const nextCursor =
      page.hasMore && page.lastKeyset !== null
        ? this.cursorCodec.encode(page.lastKeyset, fingerprint)
        : null;

    return {
      data,
      meta: {
        cursor: query.cursor,
        nextCursor,
        hasMore: page.hasMore,
        totalReturned: data.length,
      },
      error: null,
    };
  }
}
