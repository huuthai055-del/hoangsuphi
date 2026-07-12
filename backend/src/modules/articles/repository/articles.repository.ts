import type {
  IArticlesRepository,
  SearchArticlesFilter,
  PaginationOptions,
  SortOptions,
  PaginatedResult,
  ArticleSortField,
} from './articles-repository.interface';
import type { Article } from '../domain/article.entity';
import type { Tag } from '../domain/tag.entity';
import { ArticleMapper, type RawArticle } from './articles.mapper';
import { TagMapper } from './tags.mapper';
import { db, type TransactionClient } from '@/lib/database/client';
import { articles, articleTags, tags } from '@/lib/database/schema';
import { eq, and, or, isNull, sql, gte, lte, desc, asc, count, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import {
  RepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  DatabaseOperationRepositoryError,
  ConstraintViolationRepositoryError,
  NotNullViolationRepositoryError,
  CheckConstraintViolationRepositoryError,
  TransactionConflictRepositoryError,
} from './repository-errors';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Classify and rethrow a raw PostgreSQL error as a typed RepositoryError.
 *
 * Note: error message describes the *operation context*, not user-facing data.
 * Sensitive values (slug, id) belong in the details object only.
 */
function mapDbError(err: unknown, operation: string, details?: Record<string, unknown>): never {
  if (err instanceof RepositoryError) {
    throw err;
  }
  const pgErr = err as { code?: string; constraint?: string; column?: string };
  switch (pgErr.code) {
    case '23505':
      throw new DuplicateKeyRepositoryError(
        `${operation} failed: unique constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '23503':
      throw new ConstraintViolationRepositoryError(
        `${operation} failed: foreign key constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '23502':
      throw new NotNullViolationRepositoryError(
        `${operation} failed: not-null constraint violated`,
        { column: pgErr.column, ...details },
        err as Error
      );
    case '23514':
      throw new CheckConstraintViolationRepositoryError(
        `${operation} failed: check constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '40001':
    case '40P01':
      throw new TransactionConflictRepositoryError(
        `${operation} failed: transaction conflict (serialization / deadlock)`,
        details,
        err as Error
      );
    default:
      throw new DatabaseOperationRepositoryError(
        `${operation} failed: unexpected database error`,
        details,
        err as Error
      );
  }
}

export class DrizzleArticlesRepository implements IArticlesRepository {
  private getClient(tx?: TransactionClient) {
    return tx ?? db;
  }

  // Centralized projection – readonly, allocated once per instance
  private readonly articleSelection = {
    id: articles.id,
    title: articles.title,
    slug: articles.slug,
    excerpt: articles.excerpt,
    content: articles.content,
    thumbnailId: articles.thumbnailId,
    authorId: articles.authorId,
    categoryId: articles.categoryId,
    status: articles.status,
    viewCount: articles.viewCount,
    isFeatured: articles.isFeatured,
    publishedAt: articles.publishedAt,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt,
    deletedAt: articles.deletedAt,
  } as const;

  private mapArticles(results: RawArticle[]): Article[] {
    return results.map((row) => ArticleMapper.toDomain(row));
  }

  /** Build base WHERE conditions from filter. Returns a new array each time – never mutates. */
  private buildWhereConditions(filter: SearchArticlesFilter): SQL[] {
    const conditions: SQL[] = [];

    if (!filter.includeDeleted) {
      conditions.push(isNull(articles.deletedAt));
    }

    if (filter.publishedOnly) {
      conditions.push(eq(articles.status, 'published'));
    } else if (filter.status) {
      conditions.push(eq(articles.status, filter.status));
    }

    if (filter.categoryId) {
      conditions.push(eq(articles.categoryId, filter.categoryId));
    }

    if (filter.authorId) {
      conditions.push(eq(articles.authorId, filter.authorId));
    }

    if (filter.isFeatured !== undefined) {
      conditions.push(eq(articles.isFeatured, filter.isFeatured));
    }

    if (filter.createdAfter) {
      conditions.push(gte(articles.createdAt, filter.createdAfter));
    }

    if (filter.createdBefore) {
      conditions.push(lte(articles.createdAt, filter.createdBefore));
    }

    if (filter.keyword) {
      const kw = filter.keyword.trim();
      // Use raw SQL ILIKE with ESCAPE '\' so that %, _ and \ in user input are
      // treated as literal characters rather than pattern metacharacters.
      // Drizzle's ilike() helper does not emit an ESCAPE clause, so we use sql``
      // to get the proper PostgreSQL syntax: column ILIKE $1 ESCAPE '\'
      const pattern = `%${kw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      conditions.push(
        or(
          sql`${articles.title}    ILIKE ${pattern} ESCAPE '\\'`,
          sql`${articles.excerpt}  ILIKE ${pattern} ESCAPE '\\'`,
          sql`${articles.content}  ILIKE ${pattern} ESCAPE '\\'`,
          sql`${articles.slug}     ILIKE ${pattern} ESCAPE '\\'`
        ) as SQL
      );
    }

    return conditions;
  }

  /**
   * Append the optional tagId JOIN condition on top of the base filter conditions.
   * Always returns a new array – no side effects.
   */
  private buildConditions(filter: SearchArticlesFilter): SQL[] {
    const base = this.buildWhereConditions(filter);
    return filter.tagId ? [...base, eq(articleTags.tagId, filter.tagId)] : base;
  }

  /**
   * Build a COUNT query for the given filter.
   *
   * When filtering by tag (JOIN with article_tags), we use COUNT(DISTINCT articles.id)
   * to avoid double-counting an article that matches the tag filter more than once
   * (e.g. if article_tags has duplicate rows due to a schema anomaly).
   */
  private buildCountQuery(
    client: TransactionClient | typeof db,
    filter: SearchArticlesFilter,
    conditions: SQL[]
  ) {
    if (filter.tagId) {
      // COUNT(DISTINCT articles.id) prevents inflated counts when JOIN produces duplicates
      return client
        .select({ totalCount: sql<number>`COUNT(DISTINCT ${articles.id})` })
        .from(articles)
        .innerJoin(articleTags, eq(articles.id, articleTags.articleId))
        .where(and(...conditions));
    }

    return client
      .select({ totalCount: count() })
      .from(articles)
      .where(and(...conditions));
  }

  /**
   * Build a SELECT query for the given filter, sort, and pagination.
   *
   * When filtering by tag (JOIN with article_tags), we use DISTINCT ON (articles.id)
   * so that an article tagged multiple times (or article_tags anomalies) never
   * produces duplicate rows in the result set.
   *
   * Note: PostgreSQL DISTINCT ON requires the DISTINCT column to be the leading
   * ORDER BY key, so we prepend `articles.id` to the ORDER BY clause in that case.
   */
  private buildSelectQuery(
    client: TransactionClient | typeof db,
    filter: SearchArticlesFilter,
    conditions: SQL[],
    sortCol: PgColumn,
    sortOrder: 'ASC' | 'DESC',
    limit: number,
    offset: number
  ) {
    const orderExpr = sortOrder === 'DESC' ? desc(sortCol) : asc(sortCol);

    if (filter.tagId) {
      // DISTINCT ON (articles.id) eliminates duplicate rows caused by the JOIN
      // PostgreSQL requires the DISTINCT ON key to appear first in ORDER BY
      return client
        .selectDistinctOn([articles.id], this.articleSelection)
        .from(articles)
        .innerJoin(articleTags, eq(articles.id, articleTags.articleId))
        .where(and(...conditions))
        .orderBy(asc(articles.id), orderExpr)
        .limit(limit)
        .offset(offset);
    }

    return client
      .select(this.articleSelection)
      .from(articles)
      .where(and(...conditions))
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Lightweight existence check that includes soft-deleted records.
   * Used internally by softDelete() / restore() to avoid hydrating a full Domain Entity.
   */
  private async existsIncludingDeleted(id: string): Promise<boolean> {
    try {
      const [raw] = await this.getClient()
        .select({ exists: sql<number>`1` })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);

      return !!raw;
    } catch (err: unknown) {
      mapDbError(err, 'exists article (including deleted)', { id });
    }
  }

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  public async findById(id: string, options?: { includeDeleted?: boolean }): Promise<Article | null> {
    const conditions: SQL[] = [eq(articles.id, id)];
    if (!options?.includeDeleted) conditions.push(isNull(articles.deletedAt));

    try {
      const [raw] = await this.getClient()
        .select(this.articleSelection)
        .from(articles)
        .where(and(...conditions))
        .limit(1);

      return raw ? ArticleMapper.toDomain(raw) : null;
    } catch (err: unknown) {
      mapDbError(err, 'find article by id', { id });
    }
  }

  public async findBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<Article | null> {
    const conditions: SQL[] = [eq(articles.slug, slug)];
    if (!options?.includeDeleted) conditions.push(isNull(articles.deletedAt));

    try {
      const [raw] = await this.getClient()
        .select(this.articleSelection)
        .from(articles)
        .where(and(...conditions))
        .limit(1);

      return raw ? ArticleMapper.toDomain(raw) : null;
    } catch (err: unknown) {
      mapDbError(err, 'find article by slug', { slug });
    }
  }

  public async exists(id: string): Promise<boolean> {
    try {
      const [raw] = await this.getClient()
        .select({ exists: sql<number>`1` })
        .from(articles)
        .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
        .limit(1);

      return !!raw;
    } catch (err: unknown) {
      mapDbError(err, 'check article existence', { id });
    }
  }

  public async existsBySlug(slug: string): Promise<boolean> {
    try {
      const [raw] = await this.getClient()
        .select({ exists: sql<number>`1` })
        .from(articles)
        .where(and(eq(articles.slug, slug), isNull(articles.deletedAt)))
        .limit(1);

      return !!raw;
    } catch (err: unknown) {
      mapDbError(err, 'check article existence by slug', { slug });
    }
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  public async save(article: Article, tx?: TransactionClient): Promise<void> {
    const data = ArticleMapper.toPersistence(article);
    try {
      await this.getClient(tx).insert(articles).values(data);
    } catch (err: unknown) {
      mapDbError(err, 'save article', { slug: data.slug });
    }
  }

  public async update(article: Article, tx?: TransactionClient): Promise<void> {
    const data = ArticleMapper.toPersistence(article);
    try {
      const [updated] = await this.getClient(tx)
        .update(articles)
        .set({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          thumbnailId: data.thumbnailId,
          authorId: data.authorId,
          categoryId: data.categoryId,
          status: data.status as 'draft' | 'under_review' | 'published' | 'archived',
          viewCount: data.viewCount,
          isFeatured: data.isFeatured,
          publishedAt: data.publishedAt,
          updatedAt: data.updatedAt,
          deletedAt: data.deletedAt,
        })
        .where(eq(articles.id, data.id))
        .returning({ id: articles.id });

      if (!updated) {
        throw new EntityNotFoundRepositoryError('Article not found', { id: data.id });
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'update article', { id: data.id });
    }
  }

  /**
   * Soft-delete semantics (project convention: **idempotent**).
   * If the record is already deleted, the operation is a no-op (no extra SELECT).
   * If the record does not exist at all, throw EntityNotFoundRepositoryError.
   *
   * The WHERE clause `deletedAt IS NULL` prevents double-delete from returning a row.
   * When 0 rows are affected, we do one cheap SELECT (id only, no mapper) to differentiate
   * "already deleted" (record exists) from "truly missing" (record absent).
   */
  public async softDelete(id: string, tx?: TransactionClient): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(articles)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
        .returning({ id: articles.id });

      if (!updated) {
        // Cheap lookup (id only, no mapper) to distinguish "already deleted" from "missing"
        const exists = await this.existsIncludingDeleted(id);
        if (!exists) {
          throw new EntityNotFoundRepositoryError('Article not found', { id });
        }
        // Already soft-deleted → idempotent, do nothing
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'soft delete article', { id });
    }
  }

  /**
   * Restore semantics (project convention: **idempotent**).
   * If the record is already active (not deleted), the operation is a no-op.
   * If the record does not exist at all, throw EntityNotFoundRepositoryError.
   */
  public async restore(id: string, tx?: TransactionClient): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(articles)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(articles.id, id), sql`${articles.deletedAt} IS NOT NULL`))
        .returning({ id: articles.id });

      if (!updated) {
        const exists = await this.existsIncludingDeleted(id);
        if (!exists) {
          throw new EntityNotFoundRepositoryError('Article not found', { id });
        }
        // Already active (not deleted) → idempotent, do nothing
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'restore article', { id });
    }
  }

  public async count(filter: SearchArticlesFilter): Promise<number> {
    try {
      const client = this.getClient();
      const conditions = this.buildConditions(filter);
      const [result] = await this.buildCountQuery(client, filter, conditions);
      return Number(result?.totalCount ?? 0);
    } catch (err: unknown) {
      mapDbError(err, 'count articles');
    }
  }

  public async incrementViewCount(id: string, tx?: TransactionClient): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(articles)
        .set({
          // LEAST guards against INT overflow (max value = 2 147 483 647 for PG INTEGER).
          // If the column is later migrated to BIGINT, update the constant accordingly.
          viewCount: sql`LEAST(${articles.viewCount} + 1, 2147483647)`,
        })
        .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
        .returning({ id: articles.id });

      if (!updated) {
        throw new EntityNotFoundRepositoryError('Article not found or has been deleted', { id });
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'increment article view count', { id });
    }
  }

  public async findArticlesByTag(tagId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>> {
    return this.search({ tagId }, pagination ?? {}, {});
  }

  public async search(
    filter: SearchArticlesFilter,
    pagination: PaginationOptions,
    sort: SortOptions
  ): Promise<PaginatedResult<Article>> {
    try {
      const client = this.getClient();

      // 1. Validated, clamped pagination
      let page = pagination.page ?? 1;
      if (page < 1) page = 1;

      let pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
      if (pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
      if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

      const offset = (page - 1) * pageSize;

      // 2. Shared, immutable conditions – reused by both count and select builders
      const conditions = this.buildConditions(filter);

      // 3. Sort – statically typed map prevents SQL injection
      const sortFieldMap: Record<ArticleSortField, PgColumn> = {
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        title: articles.title,
        viewCount: articles.viewCount,
      };
      const sortCol = sortFieldMap[sort.field ?? 'createdAt'] ?? articles.createdAt;
      const sortOrder = sort.order === 'DESC' ? 'DESC' : 'ASC';

      // 4. Count: uses COUNT(DISTINCT) when tag JOIN is active (prevents double-counting)
      const [countResult] = await this.buildCountQuery(client, filter, conditions);
      const total = Number(countResult?.totalCount ?? 0);

      // 5. Select: uses DISTINCT ON when tag JOIN is active (prevents duplicate rows)
      const results = await this.buildSelectQuery(client, filter, conditions, sortCol, sortOrder, pageSize, offset);

      const totalPages = Math.ceil(total / pageSize);

      return {
        items: this.mapArticles(results),
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (err: unknown) {
      mapDbError(err, 'search articles');
    }
  }

  // ---------------------------------------------------------------------------
  // Tag relation operations
  // ---------------------------------------------------------------------------

  public async findTagsByArticleId(articleId: string): Promise<Tag[]> {
    try {
      const results = await this.getClient()
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          isFeatured: tags.isFeatured,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
        })
        .from(tags)
        .innerJoin(articleTags, eq(tags.id, articleTags.tagId))
        .where(eq(articleTags.articleId, articleId))
        .orderBy(asc(tags.name)); // deterministic ordering by name

      return results.map((row) => TagMapper.toDomain(row));
    } catch (err: unknown) {
      mapDbError(err, 'find tags by article id', { articleId });
    }
  }

  public async addTagsToArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void> {
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length === 0) return;

    try {
      const values = uniqueIds.map((tagId) => ({ articleId, tagId }));
      await this.getClient(tx).insert(articleTags).values(values).onConflictDoNothing();
    } catch (err: unknown) {
      mapDbError(err, 'add tags to article', { articleId, tagIds: uniqueIds });
    }
  }

  public async removeTagsFromArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void> {
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length === 0) return;

    try {
      await this.getClient(tx)
        .delete(articleTags)
        .where(and(eq(articleTags.articleId, articleId), inArray(articleTags.tagId, uniqueIds)));
    } catch (err: unknown) {
      mapDbError(err, 'remove tags from article', { articleId, tagIds: uniqueIds });
    }
  }

  public async replaceTagsOfArticle(articleId: string, tagIds: string[], tx?: TransactionClient): Promise<void> {
    const uniqueIds = [...new Set(tagIds)];

    try {
      const execute = async (client: TransactionClient | typeof db) => {
        await client.delete(articleTags).where(eq(articleTags.articleId, articleId));
        if (uniqueIds.length > 0) {
          const values = uniqueIds.map((tagId) => ({ articleId, tagId }));
          await client.insert(articleTags).values(values);
        }
      };

      if (tx) {
        await execute(tx);
      } else {
        await db.transaction((innerTx) => execute(innerTx));
      }
    } catch (err: unknown) {
      mapDbError(err, 'replace tags of article', { articleId, tagIds: uniqueIds });
    }
  }
}
