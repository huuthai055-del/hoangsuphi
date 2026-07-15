import type {
  SearchQueryInspection,
  SearchReferenceFilter,
  SearchReferenceValidation,
  SearchRepositoryPage,
  SearchRepositoryQuery,
} from './search-read-model';

export interface ISearchRepository {
  /** Inspect parser output only; public HTTP behavior for empty tsquery belongs to SearchService. */
  inspectQuery(q: string): Promise<SearchQueryInspection>;

  /** Validate all requested references in one set-based database round trip. */
  validateReferences(filters: SearchReferenceFilter): Promise<SearchReferenceValidation>;

  /** Execute the unified read projection with stable keyset pagination. */
  search(query: SearchRepositoryQuery): Promise<SearchRepositoryPage>;
}
