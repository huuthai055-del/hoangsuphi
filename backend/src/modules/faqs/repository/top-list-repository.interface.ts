import type { TopList } from '../domain/top-list.entity';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

export interface TopListFilters {
  status?: string;
  category?: string;
  featured?: boolean;
  search?: string;
}

export interface ITopListRepository {
  findById(id: string, tx?: unknown): Promise<TopList | null>;
  findBySlug(slug: string, tx?: unknown): Promise<TopList | null>;
  create(topList: TopList, tx?: unknown): Promise<void>;
  update(topList: TopList, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>;
  exists(id: string, tx?: unknown): Promise<boolean>;
  findMany(
    options: {
      filters?: TopListFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<TopList>>;
  count(filters?: TopListFilters, tx?: unknown): Promise<number>;
}
