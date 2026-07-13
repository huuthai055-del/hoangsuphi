import { expect, test, describe } from 'bun:test';
import { Review } from './reviews.entity';
import { Favorite } from './favorites.entity';
import { ReviewRating } from './review-rating.value-object';
import {
  InvalidRatingError,
  ImmutableReviewError,
  InvalidReviewStateTransitionError,
  FavoriteDomainError,
} from './reviews.errors';

describe('Reviews & Favorites Domain Layer', () => {
  describe('ReviewRating Value Object', () => {
    test('should successfully create valid rating', () => {
      const rating = ReviewRating.create(5);
      expect(rating.getValue()).toBe(5);
    });

    test('should throw error for invalid rating bounds', () => {
      expect(() => ReviewRating.create(0)).toThrow(InvalidRatingError);
      expect(() => ReviewRating.create(6)).toThrow(InvalidRatingError);
      expect(() => ReviewRating.create(-1)).toThrow(InvalidRatingError);
    });

    test('should throw error for non-integer rating', () => {
      expect(() => ReviewRating.create(4.5)).toThrow(InvalidRatingError);
    });

    test('should evaluate equality correctly', () => {
      const r1 = ReviewRating.create(4);
      const r2 = ReviewRating.create(4);
      const r3 = ReviewRating.create(5);
      expect(r1.equals(r2)).toBe(true);
      expect(r1.equals(r3)).toBe(false);
    });
  });

  describe('Review Entity', () => {
    const validProps = {
      id: '019f4bc4-f550-7d52-bba4-3b6258b55755',
      userId: 'user-123',
      ownerType: 'PLACE' as const,
      ownerId: 'place-123',
      rating: 5,
      title: 'Great Place',
      content: 'I loved visiting this place. Beautiful views!',
    };

    test('should successfully create review with PENDING status', () => {
      const review = Review.create(validProps);
      expect(review.id).toBe(validProps.id);
      expect(review.userId).toBe(validProps.userId);
      expect(review.ownerType).toBe(validProps.ownerType);
      expect(review.ownerId).toBe(validProps.ownerId);
      expect(review.rating).toBe(validProps.rating);
      expect(review.title).toBe(validProps.title);
      expect(review.content).toBe(validProps.content);
      expect(review.status).toBe('PENDING');
      expect(review.createdAt).toBeDefined();
      expect(review.updatedAt).toBeDefined();
      expect(review.deletedAt).toBeNull();
    });

    test('should throw error if title is empty', () => {
      expect(() => Review.create({ ...validProps, title: '' })).toThrow(ImmutableReviewError);
      expect(() => Review.create({ ...validProps, title: '   ' })).toThrow(ImmutableReviewError);
    });

    test('should throw error if content is empty', () => {
      expect(() => Review.create({ ...validProps, content: '' })).toThrow(ImmutableReviewError);
      expect(() => Review.create({ ...validProps, content: '   ' })).toThrow(ImmutableReviewError);
    });

    test('should rehydrate review correctly', () => {
      const rehydratedDate = new Date();
      const review = Review.rehydrate({
        id: 'rev-id',
        userId: 'user-id',
        ownerType: 'BUSINESS',
        ownerId: 'biz-id',
        rating: 4,
        title: 'Nice service',
        content: 'Decent food and helpful staff.',
        status: 'APPROVED',
        createdAt: rehydratedDate,
        updatedAt: rehydratedDate,
        deletedAt: null,
      });

      expect(review.id).toBe('rev-id');
      expect(review.status).toBe('APPROVED');
      expect(review.rating).toBe(4);
    });

    test('should approve PENDING review', () => {
      const review = Review.create(validProps);
      const now = new Date();
      review.approve(now);
      expect(review.status).toBe('APPROVED');
      expect(review.updatedAt).toEqual(now);
    });

    test('should reject PENDING review', () => {
      const review = Review.create(validProps);
      const now = new Date();
      review.reject(now);
      expect(review.status).toBe('REJECTED');
      expect(review.updatedAt).toEqual(now);
    });

    test('should do nothing if approving already approved review', () => {
      const review = Review.create(validProps);
      review.approve();
      const prevUpdated = review.updatedAt;
      review.approve();
      expect(review.updatedAt).toEqual(prevUpdated);
    });

    test('should do nothing if rejecting already rejected review', () => {
      const review = Review.create(validProps);
      review.reject();
      const prevUpdated = review.updatedAt;
      review.reject();
      expect(review.updatedAt).toEqual(prevUpdated);
    });

    test('should throw error if transition from APPROVED to REJECTED', () => {
      const review = Review.create(validProps);
      review.approve();
      expect(() => review.reject()).toThrow(InvalidReviewStateTransitionError);
    });

    test('should throw error if transition from REJECTED to APPROVED', () => {
      const review = Review.create(validProps);
      review.reject();
      expect(() => review.approve()).toThrow(InvalidReviewStateTransitionError);
    });

    test('should soft delete review', () => {
      const review = Review.create(validProps);
      const deleteTime = new Date();
      review.softDelete(deleteTime);
      expect(review.deletedAt).toEqual(deleteTime);
      expect(review.updatedAt).toEqual(deleteTime);
    });

    test('should throw error if modifying details of soft deleted review', () => {
      const review = Review.create(validProps);
      review.softDelete();
      expect(() => review.approve()).toThrow(ImmutableReviewError);
      expect(() => review.reject()).toThrow(ImmutableReviewError);
      expect(() => review.softDelete()).toThrow(ImmutableReviewError);
      expect(() => review.updateContent({ title: 'New', content: 'New', rating: 3 })).toThrow(ImmutableReviewError);
    });

    test('should update content successfully when in PENDING status', () => {
      const review = Review.create(validProps);
      const updateTime = new Date();
      review.updateContent({
        title: 'Updated Title',
        content: 'Updated Content details.',
        rating: 3,
        now: updateTime,
      });

      expect(review.title).toBe('Updated Title');
      expect(review.content).toBe('Updated Content details.');
      expect(review.rating).toBe(3);
      expect(review.updatedAt).toEqual(updateTime);
    });

    test('should not change updatedAt if updateContent has identical values', () => {
      const review = Review.create(validProps);
      const originalUpdated = review.updatedAt;
      review.updateContent({
        title: validProps.title,
        content: validProps.content,
        rating: validProps.rating,
        now: new Date(),
      });
      expect(review.updatedAt).toEqual(originalUpdated);
    });

    test('should throw error if updating to empty title or content', () => {
      const review = Review.create(validProps);
      expect(() => review.updateContent({ title: '', content: 'valid', rating: 3 })).toThrow(ImmutableReviewError);
      expect(() => review.updateContent({ title: 'valid', content: '   ', rating: 3 })).toThrow(ImmutableReviewError);
    });

    test('should throw error if updating approved or rejected reviews', () => {
      const review1 = Review.create(validProps);
      review1.approve();
      expect(() => review1.updateContent({ title: 'New', content: 'New', rating: 4 })).toThrow(ImmutableReviewError);

      const review2 = Review.create(validProps);
      review2.reject();
      expect(() => review2.updateContent({ title: 'New', content: 'New', rating: 4 })).toThrow(ImmutableReviewError);
    });

    test('should check equality correctly', () => {
      const review1 = Review.create({ ...validProps, id: 'id-1' });
      const review2 = Review.create({ ...validProps, id: 'id-1' });
      const review3 = Review.create({ ...validProps, id: 'id-2' });
      expect(review1.equals(review2)).toBe(true);
      expect(review1.equals(review3)).toBe(false);
    });

    test('should correctly convert toPersistence object', () => {
      const review = Review.create(validProps);
      const persistence = review.toPersistence();
      expect(persistence.rating).toBe(5);
      expect(persistence.title).toBe('Great Place');
    });
  });

  describe('Favorite Entity', () => {
    const validFavProps = {
      id: '019f4bc4-f550-7d52-bba4-3b6258b55799',
      userId: 'user-789',
      ownerType: 'ARTICLE' as const,
      ownerId: 'article-123',
    };

    test('should successfully create favorite', () => {
      const favorite = Favorite.create(validFavProps);
      expect(favorite.id).toBe(validFavProps.id);
      expect(favorite.userId).toBe(validFavProps.userId);
      expect(favorite.ownerType).toBe(validFavProps.ownerType);
      expect(favorite.ownerId).toBe(validFavProps.ownerId);
      expect(favorite.createdAt).toBeDefined();
    });

    test('should throw error for empty fields', () => {
      expect(() => Favorite.create({ ...validFavProps, userId: '' })).toThrow(FavoriteDomainError);
      expect(() => Favorite.create({ ...validFavProps, ownerId: '   ' })).toThrow(FavoriteDomainError);
    });

    test('should throw error for invalid ownerType', () => {
      expect(() => Favorite.create({ ...validFavProps, ownerType: 'USER' as any })).toThrow(FavoriteDomainError);
    });

    test('should rehydrate favorite correctly', () => {
      const now = new Date();
      const favorite = Favorite.rehydrate({
        id: 'fav-id',
        userId: 'user-id',
        ownerType: 'ATTRACTION',
        ownerId: 'attr-id',
        createdAt: now,
      });
      expect(favorite.id).toBe('fav-id');
      expect(favorite.createdAt).toEqual(now);
    });

    test('should check equality correctly', () => {
      const fav1 = Favorite.create({ ...validFavProps, id: 'id-1' });
      const fav2 = Favorite.create({ ...validFavProps, id: 'id-1' });
      const fav3 = Favorite.create({ ...validFavProps, id: 'id-2' });
      expect(fav1.equals(fav2)).toBe(true);
      expect(fav1.equals(fav3)).toBe(false);
    });

    test('should correctly convert toPersistence object', () => {
      const favorite = Favorite.create(validFavProps);
      const persistence = favorite.toPersistence();
      expect(persistence.userId).toBe('user-789');
    });
  });
});
