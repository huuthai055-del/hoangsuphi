import type { Favorite } from '../../domain/favorites.entity';
import type { Review } from '../../domain/reviews.entity';
import type { FavoriteResponseDto, ReviewResponseDto } from '../../dto/reviews.dto';

export function mapReviewToResponse(review: Review): ReviewResponseDto {
  const p = review.toPersistence();
  return {
    id: p.id,
    userId: p.userId,
    ownerType: p.ownerType,
    ownerId: p.ownerId,
    rating: p.rating,
    title: p.title,
    content: p.content,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function mapFavoriteToResponse(favorite: Favorite): FavoriteResponseDto {
  const p = favorite.toPersistence();
  return {
    id: p.id,
    userId: p.userId,
    ownerType: p.ownerType,
    ownerId: p.ownerId,
    createdAt: p.createdAt.toISOString(),
  };
}
