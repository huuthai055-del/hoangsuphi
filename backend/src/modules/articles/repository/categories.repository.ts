import type { ICategoriesRepository } from './categories-repository.interface';
import type { Category } from '../domain/category.entity';
import { CategoryMapper } from './categories.mapper';
import { db, type TransactionClient } from '@/lib/database/client';
import { articleCategories } from '@/lib/database/schema';
import { eq, sql } from 'drizzle-orm';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  DatabaseOperationRepositoryError,
  ConstraintViolationRepositoryError,
  NotNullViolationRepositoryError,
  CheckConstraintViolationRepositoryError,
  TransactionConflictRepositoryError,
} from './repository-errors';

function mapDbError(err: unknown, operation: string, details?: Record<string, unknown>): never {
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
      throw new DatabaseOperationRepositoryError(`${operation} failed: unexpected database error`, details, err as Error);
  }
}

const categorySelection = {
  id: articleCategories.id,
  code: articleCategories.code,
  name: articleCategories.name,
  description: articleCategories.description,
  createdAt: articleCategories.createdAt,
  updatedAt: articleCategories.updatedAt,
} as const;

export class DrizzleCategoriesRepository implements ICategoriesRepository {
  private getClient(tx?: TransactionClient) {
    return tx ?? db;
  }

  public async findById(id: string): Promise<Category | null> {
    const [raw] = await this.getClient()
      .select(categorySelection)
      .from(articleCategories)
      .where(eq(articleCategories.id, id))
      .limit(1);

    return raw ? CategoryMapper.toDomain(raw) : null;
  }

  public async findByCode(code: string): Promise<Category | null> {
    const [raw] = await this.getClient()
      .select(categorySelection)
      .from(articleCategories)
      .where(eq(articleCategories.code, code))
      .limit(1);

    return raw ? CategoryMapper.toDomain(raw) : null;
  }

  public async findAll(): Promise<Category[]> {
    const results = await this.getClient()
      .select(categorySelection)
      .from(articleCategories);

    return results.map((row) => CategoryMapper.toDomain(row));
  }

  public async exists(id: string): Promise<boolean> {
    const [raw] = await this.getClient()
      .select({ exists: sql<number>`1` })
      .from(articleCategories)
      .where(eq(articleCategories.id, id))
      .limit(1);

    return !!raw;
  }

  public async existsByCode(code: string): Promise<boolean> {
    const [raw] = await this.getClient()
      .select({ exists: sql<number>`1` })
      .from(articleCategories)
      .where(eq(articleCategories.code, code))
      .limit(1);

    return !!raw;
  }

  public async save(category: Category, tx?: TransactionClient): Promise<void> {
    const data = CategoryMapper.toPersistence(category);
    try {
      await this.getClient(tx).insert(articleCategories).values(data);
    } catch (err: unknown) {
      mapDbError(err, 'save category', { code: data.code });
    }
  }

  public async update(category: Category, tx?: TransactionClient): Promise<void> {
    const data = CategoryMapper.toPersistence(category);
    try {
      const [updated] = await this.getClient(tx)
        .update(articleCategories)
        .set({
          code: data.code,
          name: data.name,
          description: data.description,
          updatedAt: data.updatedAt,
        })
        .where(eq(articleCategories.id, data.id))
        .returning({ id: articleCategories.id });

      if (!updated) {
        throw new EntityNotFoundRepositoryError('Category not found', { id: data.id });
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'update category', { id: data.id });
    }
  }

  public async delete(id: string, tx?: TransactionClient): Promise<void> {
    const [deleted] = await this.getClient(tx)
      .delete(articleCategories)
      .where(eq(articleCategories.id, id))
      .returning({ id: articleCategories.id });

    if (!deleted) {
      throw new EntityNotFoundRepositoryError(`Category with ID ${id} not found`);
    }
  }
}
