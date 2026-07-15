import { Review, type OwnerType } from '../domain/reviews.entity';
import type { IReviewsRepository, ReviewFilters, ReviewPagination, ReviewSort } from '../repository/reviews-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import { ReviewDomainError } from '../domain/reviews.errors';
import { runInTransaction } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: Review already exists', { cause: err });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof ReviewDomainError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('rating')) {
      return new ValidationError('Validation failed', { rating: err.message });
    }
    if (msg.includes('title')) {
      return new ValidationError('Validation failed', { title: err.message });
    }
    if (msg.includes('content')) {
      return new ValidationError('Validation failed', { content: err.message });
    }
    if (msg.includes('status') || msg.includes('transition') || msg.includes('state')) {
      return new ValidationError('Validation failed', { status: err.message });
    }
    return new ValidationError('Validation failed', { review: err.message });
  }
  return err;
}

export class ReviewsService {
  constructor(private readonly reviewsRepo: IReviewsRepository) {}

  private async loadReviewOrThrow(reviewId: string, tx?: unknown): Promise<Review> {
    const review = await this.reviewsRepo.findById(reviewId, tx);
    if (!review) {
      throw new NotFoundError(`Review not found with ID: ${reviewId}`);
    }
    return review;
  }

  private assertAccess(review: Review, caller: { id: string; roles: string[] }): void {
    const roles = caller.roles || [];
    if (review.userId !== caller.id && !roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to access this review');
    }
  }

  public async createReview(props: {
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    rating: number;
    title: string;
    content: string;
    now?: Date;
  }): Promise<Review> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        // Enforce duplicate check inside transaction
        const isDuplicate = await this.reviewsRepo.exists(props.userId, props.ownerType, props.ownerId, tx);
        if (isDuplicate) {
          throw new ConflictError(`User ${props.userId} has already reviewed ${props.ownerType} with ID ${props.ownerId}`);
        }

        const review = Review.create({
          id: generateUuidV7(),
          userId: props.userId,
          ownerType: props.ownerType,
          ownerId: props.ownerId,
          rating: props.rating,
          title: props.title,
          content: props.content,
          now: props.now,
        });

        await this.reviewsRepo.create(review, tx);

        logger.info(
          {
            traceId: store?.requestId,
            reviewId: review.id,
            executionTime: Math.round(performance.now() - startTime),
            action: 'create_review',
          },
          `Review created: ${review.id}`
        );

        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async updateReview(
    reviewId: string,
    caller: { id: string; roles: string[] },
    props: {
      title?: string;
      content?: string;
      rating?: number;
      now?: Date;
    }
  ): Promise<Review> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        this.assertAccess(review, caller);

        // State validation at application layer
        if (review.status !== 'PENDING') {
          throw new ValidationError('Validation failed', {
            status: `Cannot modify review with status: ${review.status}`,
          });
        }

        review.updateContent({
          title: props.title ?? review.title,
          content: props.content ?? review.content,
          rating: props.rating ?? review.rating,
          now: props.now,
        });
        await this.reviewsRepo.update(review, tx);

        logger.info(
          {
            traceId: store?.requestId,
            reviewId: review.id,
            executionTime: Math.round(performance.now() - startTime),
            action: 'update_review',
          },
          `Review updated: ${review.id}`
        );

        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async approveReview(reviewId: string, now?: Date): Promise<Review> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        review.approve(now);
        await this.reviewsRepo.update(review, tx);
        logger.info({ traceId: store?.requestId, reviewId: review.id, action: 'approve_review' }, `Review approved: ${review.id}`);
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async rejectReview(reviewId: string, now?: Date): Promise<Review> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        review.reject(now);
        await this.reviewsRepo.update(review, tx);
        logger.info({ traceId: store?.requestId, reviewId: review.id, action: 'reject_review' }, `Review rejected: ${review.id}`);
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteReview(
    reviewId: string,
    caller: { id: string; roles: string[] },
    now?: Date
  ): Promise<void> {
    const store = requestStore.getStore();
    try {
      await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        this.assertAccess(review, caller);
        review.softDelete(now);
        await this.reviewsRepo.update(review, tx);
        logger.info({ traceId: store?.requestId, reviewId: review.id, action: 'delete_review' }, `Review soft-deleted: ${review.id}`);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async getReview(reviewId: string): Promise<Review> {
    return this.loadReviewOrThrow(reviewId);
  }

  public async listReviews(options: {
    filters?: ReviewFilters;
    pagination?: ReviewPagination;
    sort?: ReviewSort;
    search?: string;
  }): Promise<{ items: Review[]; total: number }> {
    try {
      const [items, total] = await Promise.all([
        this.reviewsRepo.findMany(options),
        this.reviewsRepo.count(options.filters),
      ]);
      return { items, total };
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async listReviewsByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: ReviewPagination
  ): Promise<Review[]> {
    return this.reviewsRepo.findByOwner(ownerType, ownerId, pagination);
  }

  public async listReviewsByUser(
    userId: string,
    caller: { id: string; roles: string[] },
    pagination?: ReviewPagination
  ): Promise<Review[]> {
    const roles = caller.roles || [];
    if (userId !== caller.id && !roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to access these reviews');
    }
    return this.reviewsRepo.findByUser(userId, pagination);
  }

  public async calculateAverageRating(ownerType: OwnerType, ownerId: string): Promise<number> {
    return this.reviewsRepo.averageRating(ownerType, ownerId);
  }
}
