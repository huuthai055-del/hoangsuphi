import type { Itinerary } from '../domain/itinerary.entity';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

export interface ItineraryFilters {
  status?: string;
  visibility?: string;
  createdBy?: string;
  search?: string;
}

export interface IItineraryRepository {
  findById(id: string, tx?: unknown): Promise<Itinerary | null>;
  create(itinerary: Itinerary, tx?: unknown): Promise<void>;
  update(itinerary: Itinerary, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>;
  findByUser(
    userId: string,
    pagination?: PaginationOptions,
    tx?: unknown
  ): Promise<PaginatedResult<Itinerary>>;
  exists(id: string, tx?: unknown): Promise<boolean>;
  findMany(
    options: {
      filters?: ItineraryFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Itinerary>>;
  count(filters?: ItineraryFilters, tx?: unknown): Promise<number>;
}
