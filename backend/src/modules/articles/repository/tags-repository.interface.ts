import type { TransactionClient } from '@/lib/database/client';
import type { Tag } from '../domain/tag.entity';

export interface ListTagsOptions {
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
}

export interface ITagsRepository {
  findById(id: string): Promise<Tag | null>;
  findBySlug(slug: string): Promise<Tag | null>;
  findAll(options?: ListTagsOptions): Promise<Tag[]>;
  findByIds(ids: string[]): Promise<Tag[]>;
  exists(id: string): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  save(tag: Tag, tx?: TransactionClient): Promise<void>;
  update(tag: Tag, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;
}
