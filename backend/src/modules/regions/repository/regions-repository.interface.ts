import type { TransactionClient } from '@/lib/database/client';
import type { Region } from '../domain/region.aggregate';

export interface ListRegionsOptions {
  page?: number;
  limit?: number;
  level?: number;
  parentId?: string | null;
}

export interface IRegionsRepository {
  findById(id: string): Promise<Region | null>;
  findBySlug(slug: string): Promise<Region | null>;
  findChildren(
    parentId: string | null,
    options?: { page?: number; limit?: number }
  ): Promise<Region[]>;
  findSubtree(parentPath: string, tx?: TransactionClient): Promise<Region[]>;
  list(options: ListRegionsOptions): Promise<Region[]>;
  count(options: ListRegionsOptions): Promise<number>;
  save(region: Region): Promise<void>;
  update(region: Region, tx?: TransactionClient): Promise<void>;
  softDelete(id: string): Promise<void>;
}
