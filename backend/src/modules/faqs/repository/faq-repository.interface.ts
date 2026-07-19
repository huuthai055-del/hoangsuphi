import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';
import type { Faq } from '../domain/faq.entity';

export interface FaqFilters {
  status?: string;
  category?: string;
  search?: string;
}

export interface IFaqRepository {
  findById(id: string, tx?: unknown): Promise<Faq | null>;
  create(faq: Faq, tx?: unknown): Promise<void>;
  update(faq: Faq, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>;
  exists(id: string, tx?: unknown): Promise<boolean>;
  findMany(
    options: {
      filters?: FaqFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Faq>>;
  count(filters?: FaqFilters, tx?: unknown): Promise<number>;
}
