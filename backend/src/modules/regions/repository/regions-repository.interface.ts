import type { Region } from '../domain/region.aggregate';
import type { TransactionClient } from '@/lib/database/client';

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
  findSubtree(parentPath: string): Promise<Region[]>;
  list(options: ListRegionsOptions): Promise<Region[]>;
  save(region: Region): Promise<void>;
  update(region: Region, tx?: TransactionClient): Promise<void>;
  softDelete(id: string): Promise<void>;
}
