import { Review, type OwnerType } from '../domain/reviews.entity';
import type { IReviewsRepository, ReviewFilters, ReviewPagination, ReviewSort } from '../repository/reviews-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import { ReviewDomainError } from '../domain/reviews.errors';
import { runInTransaction } from '@/lib/database/client';

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
      return new ValidationError({ rating: err.message });
    }
    if (msg.includes('title')) {
      return new ValidationError({ title: err.message });
    }
    if (msg.includes('content')) {
      return new ValidationError({ content: err.message });
    }
    if (msg.includes('status') || msg.includes('transition') || msg.includes('state')) {
      return new ValidationError({ status: err.message });
    }
    return new ValidationError({ review: err.message });
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

  public async createReview(props: {
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    rating: number;
    title: string;
    content: string;
    now?: Date;
  }): Promise<Review> {
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
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async updateReview(
    reviewId: string,
    props: {
      title: string;
      content: string;
      rating: number;
      now?: Date;
    }
  ): Promise<Review> {
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);

        // State validation at application layer
        if (review.status !== 'PENDING') {
          throw new ValidationError({ status: `Cannot modify review with status: ${review.status}` });
        }

        review.updateContent(props);
        await this.reviewsRepo.update(review, tx);
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async approveReview(reviewId: string, now?: Date): Promise<Review> {
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        review.approve(now);
        await this.reviewsRepo.update(review, tx);
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async rejectReview(reviewId: string, now?: Date): Promise<Review> {
    try {
      return await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        review.reject(now);
        await this.reviewsRepo.update(review, tx);
        return review;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteReview(reviewId: string, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const review = await this.loadReviewOrThrow(reviewId, tx);
        review.softDelete(now);
        await this.reviewsRepo.update(review, tx);
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
  }): Promise<Review[]> {
    return this.reviewsRepo.findMany(options);
  }

  public async listReviewsByOwner(
    ownerType: OwnerType,
    ownerId: string,
    pagination?: ReviewPagination
  ): Promise<Review[]> {
    return this.reviewsRepo.findByOwner(ownerType, ownerId, pagination);
  }

  public async listReviewsByUser(userId: string, pagination?: ReviewPagination): Promise<Review[]> {
    return this.reviewsRepo.findByUser(userId, pagination);
  }

  public async calculateAverageRating(ownerType: OwnerType, ownerId: string): Promise<number> {
    return this.reviewsRepo.averageRating(ownerType, ownerId);
  }
}
