import { db, type TransactionClient } from '@/lib/database/client';
import { eq, and, isNull, sql, desc, asc, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  IItineraryRepository,
  ItineraryFilters,
} from './itinerary-repository.interface';
import type { Itinerary } from '../domain/itinerary.entity';
import {
  itineraries as itinerariesSchema,
  itineraryItems as itineraryItemsSchema,
} from '@/lib/database/schema/itineraries';
import {
  ItineraryMapper,
  type RawItinerary,
  type RawItineraryItem,
} from './itinerary.mapper';
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
        `${operation} failed: raw database error`,
        details,
        err as Error
      );
  }
}

export class DrizzleItineraryRepository implements IItineraryRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  private buildConditions(filters?: ItineraryFilters): SQL[] {
    const conditions = [isNull(itinerariesSchema.deletedAt)];

    if (filters) {
      const { status, visibility, createdBy, search } = filters;
      if (status) {
        conditions.push(eq(itinerariesSchema.status, status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'));
      }
      if (visibility) {
        conditions.push(eq(itinerariesSchema.visibility, visibility as 'PUBLIC' | 'PRIVATE'));
      }
      if (createdBy) {
        conditions.push(eq(itinerariesSchema.createdBy, createdBy));
      }
      if (search) {
        const cleanSearch = `%${search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        conditions.push(
          sql`(${itinerariesSchema.title} ILIKE ${cleanSearch} ESCAPE '\\' OR ${itinerariesSchema.description} ILIKE ${cleanSearch} ESCAPE '\\')`
        );
      }
    }

    return conditions;
  }

  public async findById(id: string, tx?: unknown): Promise<Itinerary | null> {
    try {
      const client = this.getClient(tx);
      
      const [raw] = await client
        .select()
        .from(itinerariesSchema)
        .where(and(eq(itinerariesSchema.id, id), isNull(itinerariesSchema.deletedAt)));

      if (!raw) {
        return null;
      }

      const rawItems = await client
        .select()
        .from(itineraryItemsSchema)
        .where(eq(itineraryItemsSchema.itineraryId, id))
        .orderBy(asc(itineraryItemsSchema.dayNumber), asc(itineraryItemsSchema.displayOrder));

      return ItineraryMapper.toDomain(raw as RawItinerary, rawItems as RawItineraryItem[]);
    } catch (err) {
      mapDbError(err, 'findById', { id });
    }
  }

  public async create(itinerary: Itinerary, tx?: unknown): Promise<void> {
    try {
      const client = this.getClient(tx);
      const { rawItinerary, rawItems } = ItineraryMapper.toPersistence(itinerary);

      await client.insert(itinerariesSchema).values(rawItinerary);

      if (rawItems.length > 0) {
        await client.insert(itineraryItemsSchema).values(rawItems);
      }
    } catch (err) {
      mapDbError(err, 'create', { id: itinerary.id });
    }
  }

  public async update(itinerary: Itinerary, tx?: unknown): Promise<void> {
    try {
      const client = this.getClient(tx);
      const { rawItinerary, rawItems } = ItineraryMapper.toPersistence(itinerary);

      const [updated] = await client
        .update(itinerariesSchema)
        .set({
          title: rawItinerary.title,
          description: rawItinerary.description,
          visibility: rawItinerary.visibility,
          status: rawItinerary.status,
          updatedAt: rawItinerary.updatedAt,
        })
        .where(eq(itinerariesSchema.id, itinerary.id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`Itinerary not found for update with ID: ${itinerary.id}`);
      }

      // Sync items: Delete old items first to prevent unique index conflicts on displayOrder
      await client
        .delete(itineraryItemsSchema)
        .where(eq(itineraryItemsSchema.itineraryId, itinerary.id));

      if (rawItems.length > 0) {
        await client.insert(itineraryItemsSchema).values(rawItems);
      }
    } catch (err) {
      mapDbError(err, 'update', { id: itinerary.id });
    }
  }

  public async delete(id: string, tx?: unknown): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(itinerariesSchema)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(itinerariesSchema.id, id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`Itinerary not found for deletion with ID: ${id}`);
      }
    } catch (err) {
      mapDbError(err, 'delete', { id });
    }
  }

  public async exists(id: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ count: sql<number>`count(*)` })
        .from(itinerariesSchema)
        .where(and(eq(itinerariesSchema.id, id), isNull(itinerariesSchema.deletedAt)));
      return (row?.count ?? 0) > 0;
    } catch (err) {
      mapDbError(err, 'exists', { id });
    }
  }

  public async findByUser(
    userId: string,
    pagination?: PaginationOptions,
    tx?: unknown
  ): Promise<PaginatedResult<Itinerary>> {
    return this.findMany(
      {
        filters: { createdBy: userId },
        pagination,
      },
      tx
    );
  }

  public async findMany(
    options: {
      filters?: ItineraryFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Itinerary>> {
    try {
      const client = this.getClient(tx);
      const conditions = this.buildConditions(options.filters);

      // Count total matching
      const [countRow] = await client
        .select({ count: sql<string>`count(*)` })
        .from(itinerariesSchema)
        .where(and(...conditions));
      const total = countRow?.count ? Number.parseInt(countRow.count, 10) : 0;

      // Setup default pagination parameters
      const limit = options.pagination?.limit ?? 10;
      const offset = options.pagination?.offset ?? 0;

      const query = client
        .select()
        .from(itinerariesSchema)
        .where(and(...conditions))
        .$dynamic();

      // Sorting
      if (options.sort) {
        const orderFn = options.sort.order === 'asc' ? asc : desc;
        switch (options.sort.field) {
          case 'title':
            query.orderBy(orderFn(itinerariesSchema.title));
            break;
          default:
            query.orderBy(orderFn(itinerariesSchema.createdAt));
            break;
        }
      } else {
        query.orderBy(desc(itinerariesSchema.createdAt));
      }

      // Pagination
      query.limit(limit).offset(offset);

      const rows = await query;

      // Batch load child items to prevent N+1 query issue
      const itineraries: Itinerary[] = [];
      if (rows.length > 0) {
        const itineraryIds = rows.map((r) => r.id);

        const allItems = await client
          .select()
          .from(itineraryItemsSchema)
          .where(inArray(itineraryItemsSchema.itineraryId, itineraryIds))
          .orderBy(asc(itineraryItemsSchema.dayNumber), asc(itineraryItemsSchema.displayOrder));

        // Group child items by itineraryId
        const itemsGroupMap = new Map<string, RawItineraryItem[]>();
        for (const item of allItems) {
          if (!itemsGroupMap.has(item.itineraryId)) {
            itemsGroupMap.set(item.itineraryId, []);
          }
          itemsGroupMap.get(item.itineraryId)?.push(item as RawItineraryItem);
        }

        for (const row of rows) {
          const rawItems = itemsGroupMap.get(row.id) ?? [];
          itineraries.push(ItineraryMapper.toDomain(row as RawItinerary, rawItems));
        }
      }

      const totalPages = Math.ceil(total / limit);
      const page = Math.floor(offset / limit) + 1;

      return {
        items: itineraries,
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

  public async count(filters?: ItineraryFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = this.buildConditions(filters);

      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(*)` })
        .from(itinerariesSchema)
        .where(and(...conditions));

      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'count', filters);
    }
  }
}
