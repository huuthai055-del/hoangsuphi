import { type TransactionClient, db } from '@/lib/database/client';
import { tags } from '@/lib/database/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Tag } from '../domain/tag.entity';
import {
  CheckConstraintViolationRepositoryError,
  ConstraintViolationRepositoryError,
  DatabaseOperationRepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  NotNullViolationRepositoryError,
  RepositoryError,
  TransactionConflictRepositoryError,
} from './repository-errors';
import type { ITagsRepository, ListTagsOptions } from './tags-repository.interface';
import { TagMapper } from './tags.mapper';

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
        `${operation} failed: transaction conflict`,
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
    try {
      const [raw] = await this.getClient()
        .select(tagSelection)
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);

      return raw ? TagMapper.toDomain(raw) : null;
    } catch (err: unknown) {
      mapDbError(err, 'find tag by id', { id });
    }
  }

  public async findBySlug(slug: string): Promise<Tag | null> {
    try {
      const [raw] = await this.getClient()
        .select(tagSelection)
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);

      return raw ? TagMapper.toDomain(raw) : null;
    } catch (err: unknown) {
      mapDbError(err, 'find tag by slug', { slug });
    }
  }

  public async findAll(options?: ListTagsOptions): Promise<Tag[]> {
    try {
      let page = options?.page ?? 1;
      if (page < 1) page = 1;
      let limit = options?.limit ?? 100;
      if (limit < 1) limit = 1;
      if (limit > 100) limit = 100;

      const offset = (page - 1) * limit;

      const conditions = [];
      if (options?.featuredOnly) {
        conditions.push(eq(tags.isFeatured, true));
      }

      const query = this.getClient().select(tagSelection).from(tags);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const results = await query.orderBy(asc(tags.name)).limit(limit).offset(offset);

      return results.map((row) => TagMapper.toDomain(row));
    } catch (err: unknown) {
      mapDbError(err, 'find all tags');
    }
  }

  public async findByIds(ids: string[]): Promise<Tag[]> {
    if (!ids || ids.length === 0) return [];

    try {
      const results = await this.getClient()
        .select(tagSelection)
        .from(tags)
        .where(inArray(tags.id, ids))
        .orderBy(asc(tags.name));

      return results.map((row) => TagMapper.toDomain(row));
    } catch (err: unknown) {
      mapDbError(err, 'find tags by ids', { ids });
    }
  }

  public async exists(id: string): Promise<boolean> {
    try {
      const [raw] = await this.getClient()
        .select({ exists: sql<number>`1` })
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);

      return !!raw;
    } catch (err: unknown) {
      mapDbError(err, 'check tag existence', { id });
    }
  }

  public async existsBySlug(slug: string): Promise<boolean> {
    try {
      const [raw] = await this.getClient()
        .select({ exists: sql<number>`1` })
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);

      return !!raw;
    } catch (err: unknown) {
      mapDbError(err, 'check tag existence by slug', { slug });
    }
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
    try {
      const [deleted] = await this.getClient(tx)
        .delete(tags)
        .where(eq(tags.id, id))
        .returning({ id: tags.id });

      if (!deleted) {
        throw new EntityNotFoundRepositoryError('Tag not found', { id });
      }
    } catch (err: unknown) {
      if (err instanceof EntityNotFoundRepositoryError) throw err;
      mapDbError(err, 'delete tag', { id });
    }
  }
}
