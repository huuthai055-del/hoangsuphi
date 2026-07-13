import { db, type TransactionClient } from '@/lib/database/client';
import { eq, and, isNull, sql, desc, asc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { IFaqRepository, FaqFilters } from './faq-repository.interface';
import type { Faq } from '../domain/faq.entity';
import { faqs as faqsSchema } from '@/lib/database/schema/faqs';
import { FaqMapper, type RawFaq } from './faq.mapper';
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

export class DrizzleFaqRepository implements IFaqRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  private buildConditions(filters?: FaqFilters): SQL[] {
    const conditions: SQL[] = [isNull(faqsSchema.deletedAt)];

    if (filters) {
      const { status, category, search } = filters;
      if (status) conditions.push(eq(faqsSchema.status, status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'));
      if (category) conditions.push(eq(faqsSchema.category, category));
      if (search) {
        const cleanSearch = `%${search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        conditions.push(
          sql`(${faqsSchema.question} ILIKE ${cleanSearch} ESCAPE '\\' OR ${faqsSchema.answer} ILIKE ${cleanSearch} ESCAPE '\\')`
        );
      }
    }

    return conditions;
  }

  public async findById(id: string, tx?: unknown): Promise<Faq | null> {
    try {
      const [raw] = await this.getClient(tx)
        .select()
        .from(faqsSchema)
        .where(and(eq(faqsSchema.id, id), isNull(faqsSchema.deletedAt)));

      return raw ? FaqMapper.toDomain(raw as RawFaq) : null;
    } catch (err) {
      mapDbError(err, 'findById', { id });
    }
  }

  public async create(faq: Faq, tx?: unknown): Promise<void> {
    try {
      await this.getClient(tx).insert(faqsSchema).values(FaqMapper.toPersistence(faq));
    } catch (err) {
      mapDbError(err, 'create', { id: faq.id });
    }
  }

  public async update(faq: Faq, tx?: unknown): Promise<void> {
    try {
      const raw = FaqMapper.toPersistence(faq);
      const [updated] = await this.getClient(tx)
        .update(faqsSchema)
        .set({
          question: raw.question,
          answer: raw.answer,
          category: raw.category,
          displayOrder: raw.displayOrder,
          status: raw.status,
          updatedAt: raw.updatedAt,
          deletedAt: raw.deletedAt,
        })
        .where(eq(faqsSchema.id, faq.id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`FAQ not found for update with ID: ${faq.id}`);
      }
    } catch (err) {
      mapDbError(err, 'update', { id: faq.id });
    }
  }

  public async delete(id: string, tx?: unknown): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(faqsSchema)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(faqsSchema.id, id))
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`FAQ not found for deletion with ID: ${id}`);
      }
    } catch (err) {
      mapDbError(err, 'delete', { id });
    }
  }

  public async exists(id: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ count: sql<number>`count(*)` })
        .from(faqsSchema)
        .where(and(eq(faqsSchema.id, id), isNull(faqsSchema.deletedAt)));
      return (row?.count ?? 0) > 0;
    } catch (err) {
      mapDbError(err, 'exists', { id });
    }
  }

  public async findMany(
    options: {
      filters?: FaqFilters;
      pagination?: PaginationOptions;
      sort?: { field: string; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Faq>> {
    try {
      const client = this.getClient(tx);
      const conditions = this.buildConditions(options.filters);

      const [countRow] = await client
        .select({ count: sql<string>`count(*)` })
        .from(faqsSchema)
        .where(and(...conditions));
      const total = countRow?.count ? Number.parseInt(countRow.count, 10) : 0;

      const limit = options.pagination?.limit ?? 10;
      const offset = options.pagination?.offset ?? 0;

      const query = client
        .select()
        .from(faqsSchema)
        .where(and(...conditions))
        .$dynamic();

      if (options.sort) {
        const orderFn = options.sort.order === 'asc' ? asc : desc;
        switch (options.sort.field) {
          case 'question':
            query.orderBy(orderFn(faqsSchema.question));
            break;
          case 'displayOrder':
            query.orderBy(orderFn(faqsSchema.displayOrder));
            break;
          default:
            query.orderBy(orderFn(faqsSchema.createdAt));
            break;
        }
      } else {
        query.orderBy(asc(faqsSchema.displayOrder));
      }

      query.limit(limit).offset(offset);
      const rows = await query;

      const items = rows.map((row) => FaqMapper.toDomain(row as RawFaq));
      const totalPages = Math.ceil(total / limit);
      const page = Math.floor(offset / limit) + 1;

      return {
        items,
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

  public async count(filters?: FaqFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = this.buildConditions(filters);
      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(*)` })
        .from(faqsSchema)
        .where(and(...conditions));
      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'count', filters);
    }
  }
}
