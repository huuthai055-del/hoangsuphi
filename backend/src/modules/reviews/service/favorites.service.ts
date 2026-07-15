import { Favorite } from '../domain/favorites.entity';
import type { OwnerType } from '../domain/reviews.entity';
import type {
  IFavoritesRepository,
  FavoriteFilters,
  FavoritePagination,
} from '../repository/reviews-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import { ValidationError } from '@/common/errors/http.errors';
import { FavoriteDomainError } from '../domain/reviews.errors';
import { runInTransaction } from '@/lib/database/client';

export class FavoritesService {
  constructor(private readonly favoritesRepo: IFavoritesRepository) {}

  public async addFavorite(props: {
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    now?: Date;
  }): Promise<Favorite> {
    try {
      return await runInTransaction(async (tx) => {
        // Idempotent: If favorite already exists, return the existing favorite without throwing
        const existing = await this.favoritesRepo.findMany({
          filters: {
            userId: props.userId,
            ownerType: props.ownerType,
            ownerId: props.ownerId,
          },
        }, tx);

        const [existingFavorite] = existing;
        if (existingFavorite) {
          return existingFavorite;
        }

        const favorite = Favorite.create({
          id: generateUuidV7(),
          userId: props.userId,
          ownerType: props.ownerType,
          ownerId: props.ownerId,
          now: props.now,
        });

        await this.favoritesRepo.create(favorite, tx);
        return favorite;
      });
    } catch (err) {
      if (err instanceof FavoriteDomainError) {
        throw new ValidationError('Validation failed', { fields: err.message });
      }
      throw err;
    }
  }

  public async removeFavorite(userId: string, ownerType: OwnerType, ownerId: string): Promise<void> {
    await runInTransaction(async (tx) => {
      // Idempotent: If favorite does not exist, do not throw
      const existing = await this.favoritesRepo.findMany({
        filters: {
          userId,
          ownerType,
          ownerId,
        },
      }, tx);

      const [favorite] = existing;
      if (!favorite) {
        return;
      }

      await this.favoritesRepo.delete(favorite.id, tx);
    });
  }

  public async removeFavoriteById(id: string, userId: string): Promise<void> {
    await runInTransaction(async (tx) => {
      const existing = await this.favoritesRepo.findMany({
        filters: {
          userId,
        },
      }, tx);

      const favorite = existing.find((f) => f.id === id);
      if (!favorite) {
        return;
      }

      await this.favoritesRepo.delete(id, tx);
    });
  }

  public async checkFavorite(userId: string, ownerType: OwnerType, ownerId: string): Promise<boolean> {
    return this.favoritesRepo.exists(userId, ownerType, ownerId);
  }

  public async listFavorites(options: {
    filters?: FavoriteFilters;
    pagination?: FavoritePagination;
  }): Promise<Favorite[]> {
    return this.favoritesRepo.findMany(options);
  }

  public async countFavorites(filters: FavoriteFilters): Promise<number> {
    return this.favoritesRepo.count(filters);
  }
}
