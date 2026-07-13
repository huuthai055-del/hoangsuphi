import { Review } from '../domain/reviews.entity';
import { Favorite } from '../domain/favorites.entity';

export interface RawReview {
  id: string;
  userId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ARTICLE' | 'ATTRACTION';
  ownerId: string;
  rating: number;
  title: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RawFavorite {
  id: string;
  userId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ARTICLE' | 'ATTRACTION';
  ownerId: string;
  createdAt: Date;
}

export const ReviewsMapper = {
  toDomain(raw: RawReview): Review {
    return Review.rehydrate({
      id: raw.id,
      userId: raw.userId,
      ownerType: raw.ownerType,
      ownerId: raw.ownerId,
      rating: raw.rating,
      title: raw.title,
      content: raw.content,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(domain: Review): RawReview {
    return domain.toPersistence();
  },
};

export const FavoritesMapper = {
  toDomain(raw: RawFavorite): Favorite {
    return Favorite.rehydrate({
      id: raw.id,
      userId: raw.userId,
      ownerType: raw.ownerType,
      ownerId: raw.ownerId,
      createdAt: raw.createdAt,
    });
  },

  toPersistence(domain: Favorite): RawFavorite {
    return domain.toPersistence();
  },
};
