import type { Favorite } from '../domain/favorites.entity';
import type { OwnerType, Review, ReviewStatus } from '../domain/reviews.entity';

export interface ReviewFilters {
  ownerType?: OwnerType;
  ownerId?: string;
  userId?: string;
  status?: ReviewStatus;
  rating?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ReviewPagination {
  limit: number;
  offset: number;
}

export interface ReviewSort {
  field: 'createdAt' | 'rating';
  order: 'asc' | 'desc';
}

export interface IReviewsRepository {
  create(review: Review, tx?: unknown): Promise<void>;
  update(review: Review, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>; // hard delete
  findById(id: string, tx?: unknown): Promise<Review | null>;
  exists(userId: string, ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<boolean>;
  findByUser(userId: string, pagination?: ReviewPagination, tx?: unknown): Promise<Review[]>;
  findByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]>;
  findApproved(
    filters?: ReviewFilters,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]>;
  findPending(
    filters?: ReviewFilters,
    pagination?: ReviewPagination,
    tx?: unknown
  ): Promise<Review[]>;
  countByOwner(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number>;
  averageRating(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number>;
  findMany(
    options: {
      filters?: ReviewFilters;
      pagination?: ReviewPagination;
      sort?: ReviewSort;
      search?: string;
    },
    tx?: unknown
  ): Promise<Review[]>;
  count(filters?: ReviewFilters, tx?: unknown): Promise<number>;
}

export interface FavoriteFilters {
  ownerType?: OwnerType;
  ownerId?: string;
  userId?: string;
}

export interface FavoritePagination {
  limit: number;
  offset: number;
}

export interface IFavoritesRepository {
  create(favorite: Favorite, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>; // hard delete
  exists(userId: string, ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<boolean>;
  findByUser(userId: string, pagination?: FavoritePagination, tx?: unknown): Promise<Favorite[]>;
  findByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: FavoritePagination,
    tx?: unknown
  ): Promise<Favorite[]>;
  countByOwner(ownerType: OwnerType, ownerId: string, tx?: unknown): Promise<number>;
  findMany(
    options: {
      filters?: FavoriteFilters;
      pagination?: FavoritePagination;
    },
    tx?: unknown
  ): Promise<Favorite[]>;
  count(filters?: FavoriteFilters, tx?: unknown): Promise<number>;
}
