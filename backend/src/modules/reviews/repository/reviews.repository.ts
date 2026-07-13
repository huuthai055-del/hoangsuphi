import { db, type TransactionClient } from '@/lib/database/client';
import { eq, and, isNull, sql, desc, asc } from 'drizzle-orm';
import type {
  IReviewsRepository,
  IFavoritesRepository,
  ReviewFilters,
  ReviewPagination,
  ReviewSort,
  FavoriteFilters,
  FavoritePagination,
} from './reviews-repository.interface';
import type { Review, OwnerType, ReviewStatus } from '../domain/reviews.entity';
import type { Favorite } from '../domain/favorites.entity';
import {
  reviews as reviewsSchema,
  favorites as favoritesSchema,
} from '@/lib/database/schema/reviews';
import {
  ReviewsMapper,
  FavoritesMapper,
  type RawReview,
  type RawFavorite,
} from './reviews.mapper';
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

export class DrizzleReviewsRepository implements IReviewsRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  public async create(review: Review, tx?: unknown): Promise<void> {
    try {
      const raw = ReviewsMapper.toPersistence(review);
      await this.getClient(tx).insert(reviewsSchema).values(raw);
    } catch (err) {
      mapDbError(err, 'createReview', { id: review.id });
    }
  }

  public async update(review: Review, tx?: unknown): Promise<void> {
    try {
      const raw = ReviewsMapper.toPersistence(review);
      const [updated] = await this.getClient(tx)
        .update(reviewsSchema)
        .set(raw)
        .where(and(eq(reviewsSchema.id, review.id), isNull(reviewsSchema.deletedAt)))
        .returning({ id: reviewsSchema.id });

      if (!updated) {
        throw new EntityNotFoundRepositoryError(`Review not found or soft-deleted: ${review.id}`);
      }
    } catch (err) {
      mapDbError(err, 'updateReview', { id: review.id });
    }
  }

  public async delete(id: string, tx?: unknown): Promise<void> {
    try {
      const [deleted] = await this.getClient(tx)
        .delete(reviewsSchema)
        .where(eq(reviewsSchema.id, id))
        .returning({ id: reviewsSchema.id });

      if (!deleted) {
        throw new EntityNotFoundRepositoryError(`Review not found with ID: ${id}`);
      }
    } catch (err) {
      mapDbError(err, 'deleteReview', { id });
    }
  }

  public async findById(id: string, tx?: unknown): Promise<Review | null> {
    try {
      const [row] = await this.getClient(tx)
        .select()
        .from(reviewsSchema)
        .where(and(eq(reviewsSchema.id, id), isNull(reviewsSchema.deletedAt)))
        .limit(1);

      if (!row) return null;
      return ReviewsMapper.toDomain(row as RawReview);
    } catch (err) {
      mapDbError(err, 'findById', { id });
    }
  }

  public async exists(userId: string, ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ exists: sql`1` })
        .from(reviewsSchema)
        .where(
          and(
            eq(reviewsSchema.userId, userId),
            eq(reviewsSchema.ownerType, ownerType),
            eq(reviewsSchema.ownerId, ownerId),
            isNull(reviewsSchema.deletedAt)
          )
        )
        .limit(1);
      return !!row;
    } catch (err) {
      mapDbError(err, 'exists', { userId, ownerType, ownerId });
    }
  }

  public async findByUser(userId: string, pagination?: ReviewPagination, tx?: unknown): Promise<Review[]> {
    try {
      const query = this.getClient(tx)
        .select()
        .from(reviewsSchema)
        .where(and(eq(reviewsSchema.userId, userId), isNull(reviewsSchema.deletedAt)))
        .orderBy(desc(reviewsSchema.createdAt))
        .$dynamic();

      if (pagination) {
        query.limit(pagination.limit).offset(pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => ReviewsMapper.toDomain(row as RawReview));
    } catch (err) {
      mapDbError(err, 'findByUser', { userId });
    }
  }

  public async findByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]> {
    try {
      const query = this.getClient(tx)
        .select()
        .from(reviewsSchema)
        .where(
          and(
            eq(reviewsSchema.ownerType, ownerType),
            eq(reviewsSchema.ownerId, ownerId),
            isNull(reviewsSchema.deletedAt)
          )
        )
        .orderBy(desc(reviewsSchema.createdAt))
        .$dynamic();

      if (pagination) {
        query.limit(pagination.limit).offset(pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => ReviewsMapper.toDomain(row as RawReview));
    } catch (err) {
      mapDbError(err, 'findByOwner', { ownerType, ownerId });
    }
  }

  public async findApproved(
    filters?: ReviewFilters,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]> {
    return this.findMany(
      {
        filters: { ...filters, status: 'APPROVED' },
        pagination,
      },
      tx
    );
  }

  public async findPending(
    filters?: ReviewFilters,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]> {
    return this.findMany(
      {
        filters: { ...filters, status: 'PENDING' },
        pagination,
      },
      tx
    );
  }

  public async countByOwner(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number> {
    return this.count({ ownerType, ownerId }, tx);
  }

  public async averageRating(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number> {
    try {
      const [row] = await this.getClient(tx)
        .select({ avg: sql<string>`avg(${reviewsSchema.rating})` })
        .from(reviewsSchema)
        .where(
          and(
            eq(reviewsSchema.ownerType, ownerType),
            eq(reviewsSchema.ownerId, ownerId),
            eq(reviewsSchema.status, 'APPROVED'),
            isNull(reviewsSchema.deletedAt)
          )
        );
      return row?.avg ? Number.parseFloat(row.avg) : 0;
    } catch (err) {
      mapDbError(err, 'averageRating', { ownerType, ownerId });
    }
  }

  public async findMany(
    options: {
      filters?: ReviewFilters;
      pagination?: ReviewPagination;
      sort?: ReviewSort;
      search?: string;
    },
    tx?: unknown
  ): Promise<Review[]> {
    try {
      const conditions = [isNull(reviewsSchema.deletedAt)];

      if (options.filters) {
        const { ownerType, ownerId, userId, status, rating, createdAfter, createdBefore } =
          options.filters;
        if (ownerType) conditions.push(eq(reviewsSchema.ownerType, ownerType));
        if (ownerId) conditions.push(eq(reviewsSchema.ownerId, ownerId));
        if (userId) conditions.push(eq(reviewsSchema.userId, userId));
        if (status) conditions.push(eq(reviewsSchema.status, status));
        if (rating) conditions.push(eq(reviewsSchema.rating, rating));
        if (createdAfter) conditions.push(sql`${reviewsSchema.createdAt} >= ${createdAfter}`);
        if (createdBefore) conditions.push(sql`${reviewsSchema.createdAt} <= ${createdBefore}`);
      }

      if (options.search) {
        const cleanSearch = `%${options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        conditions.push(
          sql`(${reviewsSchema.title} ILIKE ${cleanSearch} ESCAPE '\\' OR ${reviewsSchema.content} ILIKE ${cleanSearch} ESCAPE '\\')`
        );
      }

      const query = this.getClient(tx)
        .select()
        .from(reviewsSchema)
        .where(and(...conditions))
        .$dynamic();

      // Sorting
      if (options.sort) {
        const orderFn = options.sort.order === 'asc' ? asc : desc;
        const sortField =
          options.sort.field === 'rating' ? reviewsSchema.rating : reviewsSchema.createdAt;
        query.orderBy(orderFn(sortField));
      } else {
        query.orderBy(desc(reviewsSchema.createdAt));
      }

      // Pagination
      if (options.pagination) {
        query.limit(options.pagination.limit).offset(options.pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => ReviewsMapper.toDomain(row as RawReview));
    } catch (err) {
      mapDbError(err, 'findMany', options);
    }
  }

  public async count(filters?: ReviewFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = [isNull(reviewsSchema.deletedAt)];

      if (filters) {
        const { ownerType, ownerId, userId, status, rating, createdAfter, createdBefore } =
          filters;
        if (ownerType) conditions.push(eq(reviewsSchema.ownerType, ownerType));
        if (ownerId) conditions.push(eq(reviewsSchema.ownerId, ownerId));
        if (userId) conditions.push(eq(reviewsSchema.userId, userId));
        if (status) conditions.push(eq(reviewsSchema.status, status));
        if (rating) conditions.push(eq(reviewsSchema.rating, rating));
        if (createdAfter) conditions.push(sql`${reviewsSchema.createdAt} >= ${createdAfter}`);
        if (createdBefore) conditions.push(sql`${reviewsSchema.createdAt} <= ${createdBefore}`);
      }

      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(${reviewsSchema.id})` })
        .from(reviewsSchema)
        .where(and(...conditions));

      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'count', filters);
    }
  }
}

export class DrizzleFavoritesRepository implements IFavoritesRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  public async create(favorite: Favorite, tx?: unknown): Promise<void> {
    try {
      const raw = FavoritesMapper.toPersistence(favorite);
      await this.getClient(tx).insert(favoritesSchema).values(raw);
    } catch (err) {
      mapDbError(err, 'createFavorite', { id: favorite.id });
    }
  }

  public async delete(id: string, tx?: unknown): Promise<void> {
    try {
      const [deleted] = await this.getClient(tx)
        .delete(favoritesSchema)
        .where(eq(favoritesSchema.id, id))
        .returning({ id: favoritesSchema.id });
      if (!deleted) {
        throw new EntityNotFoundRepositoryError(`Favorite not found with ID: ${id}`);
      }
    } catch (err) {
      mapDbError(err, 'deleteFavorite', { id });
    }
  }

  public async exists(userId: string, ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ exists: sql`1` })
        .from(favoritesSchema)
        .where(
          and(
            eq(favoritesSchema.userId, userId),
            eq(favoritesSchema.ownerType, ownerType),
            eq(favoritesSchema.ownerId, ownerId)
          )
        )
        .limit(1);
      return !!row;
    } catch (err) {
      mapDbError(err, 'existsFavorite', { userId, ownerType, ownerId });
    }
  }

  public async findByUser(
    userId: string,
    pagination?: FavoritePagination,
    tx?: unknown
  ): Promise<Favorite[]> {
    try {
      const query = this.getClient(tx)
        .select()
        .from(favoritesSchema)
        .where(eq(favoritesSchema.userId, userId))
        .orderBy(desc(favoritesSchema.createdAt))
        .$dynamic();

      if (pagination) {
        query.limit(pagination.limit).offset(pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => FavoritesMapper.toDomain(row as RawFavorite));
    } catch (err) {
      mapDbError(err, 'findByUserFavorite', { userId });
    }
  }

  public async findByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: FavoritePagination,
    tx?: unknown
  ): Promise<Favorite[]> {
    try {
      const query = this.getClient(tx)
        .select()
        .from(favoritesSchema)
        .where(and(eq(favoritesSchema.ownerType, ownerType), eq(favoritesSchema.ownerId, ownerId)))
        .orderBy(desc(favoritesSchema.createdAt))
        .$dynamic();

      if (pagination) {
        query.limit(pagination.limit).offset(pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => FavoritesMapper.toDomain(row as RawFavorite));
    } catch (err) {
      mapDbError(err, 'findByOwnerFavorite', { ownerType, ownerId });
    }
  }

  public async countByOwner(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number> {
    return this.count({ ownerType, ownerId }, tx);
  }

  public async findMany(
    options: {
      filters?: FavoriteFilters;
      pagination?: FavoritePagination;
    },
    tx?: unknown
  ): Promise<Favorite[]> {
    try {
      const conditions = [];

      if (options.filters) {
        const { ownerType, ownerId, userId } = options.filters;
        if (ownerType) conditions.push(eq(favoritesSchema.ownerType, ownerType));
        if (ownerId) conditions.push(eq(favoritesSchema.ownerId, ownerId));
        if (userId) conditions.push(eq(favoritesSchema.userId, userId));
      }

      const query = this.getClient(tx)
        .select()
        .from(favoritesSchema)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(favoritesSchema.createdAt))
        .$dynamic();

      if (options.pagination) {
        query.limit(options.pagination.limit).offset(options.pagination.offset);
      }

      const rows = await query;
      return rows.map((row) => FavoritesMapper.toDomain(row as RawFavorite));
    } catch (err) {
      mapDbError(err, 'findManyFavorite', options);
    }
  }

  public async count(filters?: FavoriteFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = [];

      if (filters) {
        const { ownerType, ownerId, userId } = filters;
        if (ownerType) conditions.push(eq(favoritesSchema.ownerType, ownerType));
        if (ownerId) conditions.push(eq(favoritesSchema.ownerId, ownerId));
        if (userId) conditions.push(eq(favoritesSchema.userId, userId));
      }

      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(${favoritesSchema.id})` })
        .from(favoritesSchema)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'countFavorite', filters);
    }
  }
}
