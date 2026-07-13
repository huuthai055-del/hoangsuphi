import type { Context } from 'hono';
import type { FavoritesService } from '../service/favorites.service';
import { mapFavoriteToResponse } from './mappers/reviews.mapper';
import type {
  CreateFavoriteRequestDto,
  FavoriteIdParamsDto,
  OwnerParamsDto,
  FavoriteFilterQueryDto,
  PaginationQueryDto,
} from '../dto/reviews.dto';
import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';
import { AuthenticationError } from '@/common/errors/http.errors';

function requireAuthenticatedUser(c: Context): AuthenticatedUser {
  const user = c.get('user');
  if (!user || !user.id) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  public create = async (c: Context) => {
    const user = requireAuthenticatedUser(c);
    const body = c.get('validBody') as CreateFavoriteRequestDto;

    const favorite = await this.service.addFavorite({
      userId: user.id,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
    });

    return c.json(mapFavoriteToResponse(favorite), 201);
  };

  public delete = async (c: Context) => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as FavoriteIdParamsDto;

    await this.service.removeFavoriteById(params.id, user.id);
    return c.body(null, 204);
  };

  public list = async (c: Context) => {
    const queryFilters = c.get('validQuery') as FavoriteFilterQueryDto;
    const pagination = c.get('validQuery') as PaginationQueryDto;

    const favorites = await this.service.listFavorites({
      filters: {
        ownerType: queryFilters.ownerType,
        ownerId: queryFilters.ownerId,
        userId: queryFilters.userId,
      },
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
      },
    });

    const mapped = favorites.map(mapFavoriteToResponse);
    return c.json({ data: mapped }, 200);
  };

  public countByOwner = async (c: Context) => {
    const params = c.get('validParams') as OwnerParamsDto;
    const count = await this.service.countFavorites({
      ownerType: params.ownerType,
      ownerId: params.ownerId,
    });
    return c.json({ count }, 200);
  };

  public listByUser = async (c: Context) => {
    const params = c.get('validParams') as { userId: string };
    const pagination = c.get('validQuery') as PaginationQueryDto;

    const favorites = await this.service.listFavorites({
      filters: {
        userId: params.userId,
      },
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
      },
    });

    const mapped = favorites.map(mapFavoriteToResponse);
    return c.json({ data: mapped }, 200);
  };
}
