import type { Context } from 'hono';
import type { ReviewsService } from '../service/reviews.service';
import { mapReviewToResponse } from './mappers/reviews.mapper';
import type {
  CreateReviewRequestDto,
  UpdateReviewRequestDto,
  ReviewIdParamsDto,
  OwnerParamsDto,
  ReviewFilterQueryDto,
  PaginationQueryDto,
  SearchQueryDto,
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

export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  public create = async (c: Context) => {
    const user = requireAuthenticatedUser(c);
    const body = c.get('validBody') as CreateReviewRequestDto;

    const review = await this.service.createReview({
      userId: user.id,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      rating: body.rating,
      title: body.title,
      content: body.content,
    });

    return c.json(mapReviewToResponse(review), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as ReviewIdParamsDto;
    const body = c.get('validBody') as UpdateReviewRequestDto;

    const review = await this.service.updateReview(params.id, body);
    return c.json(mapReviewToResponse(review), 200);
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as ReviewIdParamsDto;
    const review = await this.service.getReview(params.id);
    return c.json(mapReviewToResponse(review), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as ReviewIdParamsDto;
    await this.service.deleteReview(params.id);
    return c.body(null, 204);
  };

  public approve = async (c: Context) => {
    const params = c.get('validParams') as ReviewIdParamsDto;
    const review = await this.service.approveReview(params.id);
    return c.json(mapReviewToResponse(review), 200);
  };

  public reject = async (c: Context) => {
    const params = c.get('validParams') as ReviewIdParamsDto;
    const review = await this.service.rejectReview(params.id);
    return c.json(mapReviewToResponse(review), 200);
  };

  public list = async (c: Context) => {
    const queryFilters = c.get('validQuery') as ReviewFilterQueryDto;
    const pagination = c.get('validQuery') as PaginationQueryDto;
    const search = c.get('validQuery') as SearchQueryDto;

    const reviews = await this.service.listReviews({
      filters: {
        ownerType: queryFilters.ownerType,
        ownerId: queryFilters.ownerId,
        userId: queryFilters.userId,
        status: queryFilters.status,
        rating: queryFilters.rating,
      },
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
      },
      search: search.search,
    });

    const mapped = reviews.map(mapReviewToResponse);
    return c.json({ data: mapped }, 200);
  };

  public listByOwner = async (c: Context) => {
    const params = c.get('validParams') as OwnerParamsDto;
    const pagination = c.get('validQuery') as PaginationQueryDto;

    const reviews = await this.service.listReviewsByOwner(
      params.ownerType,
      params.ownerId,
      {
        limit: pagination.limit,
        offset: pagination.offset,
      }
    );

    const mapped = reviews.map(mapReviewToResponse);
    return c.json({ data: mapped }, 200);
  };

  public listByUser = async (c: Context) => {
    const params = c.get('validParams') as { userId: string };
    const pagination = c.get('validQuery') as PaginationQueryDto;

    const reviews = await this.service.listReviewsByUser(params.userId, {
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const mapped = reviews.map(mapReviewToResponse);
    return c.json({ data: mapped }, 200);
  };
}
