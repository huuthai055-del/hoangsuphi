import { db, type TransactionClient } from '@/lib/database/client';
import { eq, and, isNull, sql, desc, asc, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { ITopListRepository, TopListFilters } from './top-list-repository.interface';
import type { TopList } from '../domain/top-list.entity';
import { topLists as topListsSchema, topListItems as topListItemsSchema } from '@/lib/database/schema/faqs';
import { TopListMapper, type RawTopList, type RawTopListItem } from './faq.mapper';
import {
  RepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  DatabaseOperationRepositoryError,
  ConstraintViolationRepositoryError,
  NotNullViolationRepositoryError,
  CheckConstraintViolationRepositoryError,
  TransactionConflictRepositoryError,
} from '@/common/errors/repository.errors';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

function mapDbError(err: unknown, operation: string, details?: Record<string, unknown>): never {
  if (err instanceof RepositoryError) throw err;
  const pgErr = err as { code?: string; constraint?: string; column?: string };
  switch (pgErr.code) {
    case '23505':
      throw new DuplicateKeyRepositoryError(`${operation} failed: unique constraint violated`, { constraint: pgErr.constraint, ...details }, err as Error);
    case '23503':
      throw new ConstraintViolationRepositoryError(`${operation} failed: foreign key constraint violated`, { constraint: pgErr.constraint, ...details }, err as Error);
    case '23502':
      throw new NotNullViolationRepositoryError(`${operation} failed: not-null constraint violated`, { column: pgErr.column, ...details }, err as Error);
    case '23514':
      throw new CheckConstraintViolationRepositoryError(`${operation} failed: check constraint violated`, { constraint: pgErr.constraint, ...details }, err as Error);
    case '40001':
    case '40P01':
      throw new TransactionConflictRepositoryError(`${operation} failed: transaction conflict`, details, err as Error);
    default:
      throw new DatabaseOperationRepositoryError(`${operation} failed: raw database error`, details, err as Error);
  }
}

export class DrizzleTopListRepository implements ITopListRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  private buildConditions(filters?: TopListFilters): SQL[] {
    const conditions: SQL[] = [isNull(topListsSchema.deletedAt)];

    if (filters) {
      const { status, category, featured, search } = filters;
      if (status) conditions.push(eq(topListsSchema.status, status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'));
      if (category) conditions.push(eq(topListsSchema.category, category));
      if (featured !== undefined) conditions.push(eq(topListsSchema.featured, featured));
      if (search) {
        const cleanSearch = `%${search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        conditions.push(
          sql`(${topListsSchema.title} ILIKE ${cleanSearch} ESCAPE '\\' OR ${topListsSchema.description} ILIKE ${cleanSearch} ESCAPE '\\')`
        );
      }
    }

    return conditions;
  }

  private async fetchItemsForLists(
    client: ReturnType<DrizzleTopListRepository['getClient']>,
    topListIds: string[]
  ): Promise<Map<string, RawTopListItem[]>> {
    if (topListIds.length === 0) return new Map();

    const allItems = await client
      .select()
      .from(topListItemsSchema)
      .where(inArray(topListItemsSchema.topListId, topListIds))
      .orderBy(asc(topListItemsSchema.displayOrder));

    const grouped = new Map<string, RawTopListItem[]>();
    for (const item of allItems) {
      if (!grouped.has(item.topListId)) {
        grouped.set(item.topListId, []);
      }
      grouped.get(item.topListId)?.push(item as RawTopListItem);
    }
    return grouped;
  }

  public async findById(id: string, tx?: unknown): Promise<TopList | null> {
    try {
      const client = this.getClient(tx);
      const [raw] = await client
        .select()
        .from(topListsSchema)
        .where(and(eq(topListsSchema.id, id), isNull(topListsSchema.deletedAt)));

      if (!raw) return null;

      const grouped = await this.fetchItemsForLists(client, [id]);
      const rawItems = grouped.get(id) ?? [];

      return TopListMapper.toDomain(raw as RawTopList, rawItems);
    } catch (err) {
      mapDbError(err, 'findById', { id });
    }
  }

  public async findBySlug(slug: string, tx?: unknown): Promise<TopList | null> {
    try {
      const client = this.getClient(tx);
      const [raw] = await client
        .select()
        .from(topListsSchema)
        .where(and(eq(topListsSchema.slug, slug), isNull(topListsSchema.deletedAt)));

      if (!raw) return null;

      const grouped = await this.fetchItemsForLists(client, [raw.id]);
      const rawItems = grouped.get(raw.id) ?? [];

      return TopListMapper.toDomain(raw as RawTopList, rawItems);
    } catch (err) {
      mapDbError(err, 'findBySlug', { slug });
    }
  }

  public async create(topList: TopList, tx?: unknown): Promise<void> {
    try {
      const client = this.getClient(tx);
      const { rawTopList, rawItems } = TopListMapper.toPersistence(topList);

      await client.insert(topListsSchema).values(rawTopList);
      if (rawItems.length > 0) {
        await client.insert(topListItemsSchema).values(rawItems);
      }
    } catch (err) {
      mapDbError(err, 'create', { id: topList.id });
    }
  }

  public async update(topList: TopList, tx?: unknown): Promise<void> {
    try {
      const client = this.getClient(tx);
      const { rawTopList, rawItems } = TopListMapper.toPersistence(topList);

      const [updated] = await client
        .update(topListsSchema)
        .set({
          title: rawTopList.title,
          description: rawTopList.description,
          slug: rawTopList.slug,
          category: rawTopList.category,
          featured: rawTopList.featured,
          status: rawTopList.status,
          updatedAt: rawTopList.updatedAt,
        })
        .where(eq(topListsSchema.id, topList.id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`TopList not found for update with ID: ${topList.id}`);
      }

      // Sync items: delete old items, insert fresh list (avoids unique index conflicts)
      await client
        .delete(topListItemsSchema)
        .where(eq(topListItemsSchema.topListId, topList.id));

      if (rawItems.length > 0) {
        await client.insert(topListItemsSchema).values(rawItems);
      }
    } catch (err) {
      mapDbError(err, 'update', { id: topList.id });
    }
  }

  public async delete(id: string, tx?: unknown): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(topListsSchema)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(topListsSchema.id, id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`TopList not found for deletion with ID: ${id}`);
      }
    } catch (err) {
      mapDbError(err, 'delete', { id });
    }
  }

  public async exists(id: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ count: sql<number>`count(*)` })
        .from(topListsSchema)
        .where(and(eq(topListsSchema.id, id), isNull(topListsSchema.deletedAt)));
      return (row?.count ?? 0) > 0;
    } catch (err) {
      mapDbError(err, 'exists', { id });
    }
  }

  public async findMany(
    options: {
      filters?: TopListFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<TopList>> {
    try {
      const client = this.getClient(tx);
      const conditions = this.buildConditions(options.filters);

      const [countRow] = await client
        .select({ count: sql<string>`count(*)` })
        .from(topListsSchema)
        .where(and(...conditions));
      const total = countRow?.count ? Number.parseInt(countRow.count, 10) : 0;

      const limit = options.pagination?.limit ?? 10;
      const offset = options.pagination?.offset ?? 0;

      const query = client
        .select()
        .from(topListsSchema)
        .where(and(...conditions))
        .$dynamic();

      if (options.sort) {
        const orderFn = options.sort.order === 'asc' ? asc : desc;
        switch (options.sort.field) {
          case 'title':
            query.orderBy(orderFn(topListsSchema.title));
            break;
          default:
            query.orderBy(orderFn(topListsSchema.createdAt));
            break;
        }
      } else {
        query.orderBy(desc(topListsSchema.createdAt));
      }

      query.limit(limit).offset(offset);
      const rows = await query;

      // Batch-load items for all top lists (prevents N+1 query)
      const topLists: TopList[] = [];
      if (rows.length > 0) {
        const topListIds = rows.map((r) => r.id);
        const grouped = await this.fetchItemsForLists(client, topListIds);

        for (const row of rows) {
          const rawItems = grouped.get(row.id) ?? [];
          topLists.push(TopListMapper.toDomain(row as RawTopList, rawItems));
        }
      }

      const totalPages = Math.ceil(total / limit);
      const page = Math.floor(offset / limit) + 1;

      return {
        items: topLists,
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0,
      };
    } catch (err) {
      mapDbError(err, 'findMany', options);
    }
  }

  public async count(filters?: TopListFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = this.buildConditions(filters);
      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(*)` })
        .from(topListsSchema)
        .where(and(...conditions));
      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'count', filters);
    }
  }
}
