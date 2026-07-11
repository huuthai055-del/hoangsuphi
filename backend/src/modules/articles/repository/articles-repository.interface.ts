import type { Article, ArticleStatus } from '../domain/article.entity';
import type { Tag } from '../domain/tag.entity';
import type { TransactionClient } from '@/lib/database/client';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchArticlesFilter {
  keyword?: string; // search in title, excerpt, content, slug
  status?: ArticleStatus;
  categoryId?: string;
  isFeatured?: boolean;
  tagId?: string;
  authorId?: string;
  publishedOnly?: boolean;
  createdBefore?: Date;
  createdAfter?: Date;
  includeDeleted?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export type ArticleSortField = 'publishedAt' | 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
export type SortOrder = 'ASC' | 'DESC';

export interface SortOptions {
  field?: ArticleSortField;
  order?: SortOrder;
}

export interface IArticlesRepository {
  findById(id: string, options?: { includeDeleted?: boolean }): Promise<Article | null>;
  findBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<Article | null>;
  exists(id: string): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  
  save(article: Article, tx?: TransactionClient): Promise<void>;
  update(article: Article, tx?: TransactionClient): Promise<void>;
  softDelete(id: string, tx?: TransactionClient): Promise<void>;
  restore(id: string, tx?: TransactionClient): Promise<void>;

  search(
    filter: SearchArticlesFilter,
    pagination: PaginationOptions,
    sort: SortOptions
  ): Promise<PaginatedResult<Article>>;

  count(filter: SearchArticlesFilter): Promise<number>;
  incrementViewCount(id: string, tx?: TransactionClient): Promise<void>;
  findArticlesByTag(tagId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>>;

  // Tag relations
  findTagsByArticleId(articleId: string): Promise<Tag[]>;
  addTagsToArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void>;
  removeTagsFromArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void>;
  replaceTagsOfArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void>;
}
