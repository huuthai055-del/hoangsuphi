import type { ITagsRepository, ListTagsOptions } from './tags-repository.interface';
import type { Tag } from '../domain/tag.entity';
import { TagMapper } from './tags.mapper';
import { db, type TransactionClient } from '@/lib/database/client';
import { tags } from '@/lib/database/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';
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

const tagSelection = {
  id: tags.id,
  name: tags.name,
  slug: tags.slug,
  description: tags.description,
  isFeatured: tags.isFeatured,
  createdAt: tags.createdAt,
  updatedAt: tags.updatedAt,
} as const;

export class DrizzleTagsRepository implements ITagsRepository {
  private getClient(tx?: TransactionClient) {
    return tx ?? db;
  }

  public async findById(id: string): Promise<Tag | null> {
    const [raw] = await this.getClient()
      .select(tagSelection)
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    return raw ? TagMapper.toDomain(raw) : null;
  }

  public async findBySlug(slug: string): Promise<Tag | null> {
    const [raw] = await this.getClient()
      .select(tagSelection)
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    return raw ? TagMapper.toDomain(raw) : null;
  }

  public async findAll(options?: ListTagsOptions): Promise<Tag[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 100;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options?.featuredOnly) {
      conditions.push(eq(tags.isFeatured, true));
    }

    const query = this.getClient()
      .select(tagSelection)
      .from(tags);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);
    return results.map((row) => TagMapper.toDomain(row));
  }

  public async findByIds(ids: string[]): Promise<Tag[]> {
    if (!ids || ids.length === 0) return [];

    const results = await this.getClient()
      .select(tagSelection)
      .from(tags)
      .where(inArray(tags.id, ids));

    return results.map((row) => TagMapper.toDomain(row));
  }

  public async exists(id: string): Promise<boolean> {
    const [raw] = await this.getClient()
      .select({ exists: sql<number>`1` })
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    return !!raw;
  }

  public async existsBySlug(slug: string): Promise<boolean> {
    const [raw] = await this.getClient()
      .select({ exists: sql<number>`1` })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    return !!raw;
  }

  public async save(tag: Tag, tx?: TransactionClient): Promise<void> {
    const data = TagMapper.toPersistence(tag);
    try {
      await this.getClient(tx).insert(tags).values(data);
    } catch (err: unknown) {
      mapDbError(err, 'save tag', { slug: data.slug });
    }
  }

  public async update(tag: Tag, tx?: TransactionClient): Promise<void> {
    const data = TagMapper.toPersistence(tag);
    try {
      const [updated] = await this.getClient(tx)
        .update(tags)
        .set({
          name: data.name,
          slug: data.slug,
          description: data.description,
          isFeatured: data.isFeatured,
          updatedAt: data.updatedAt,
        })
        .where(eq(tags.id, data.id))
        .returning({ id: tags.id });

      if (!updated) {
        throw new EntityNotFoundRepositoryError('Tag not found', { id: data.id });
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'update tag', { id: data.id });
    }
  }

  public async delete(id: string, tx?: TransactionClient): Promise<void> {
    const [deleted] = await this.getClient(tx)
      .delete(tags)
      .where(eq(tags.id, id))
      .returning({ id: tags.id });

    if (!deleted) {
      throw new EntityNotFoundRepositoryError(`Tag with ID ${id} not found`);
    }
  }
}
