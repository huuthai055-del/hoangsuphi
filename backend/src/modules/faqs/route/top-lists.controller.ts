import type { Context } from 'hono';
import type { TopListService } from '../service/top-list.service';
import { mapTopListToResponse } from './mappers/top-lists.mapper';
import { AuthenticationError } from '@/common/errors/http.errors';
import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';
import type {
  CreateTopListRequestDto,
  UpdateTopListRequestDto,
  TopListIdParamsDto,
  AddTopListItemRequestDto,
  TopListItemIdParamsDto,
  ReorderTopListItemsRequestDto,
  TopListFilterQueryDto,
} from '../dto/top-lists.dto';

function requireAuthenticatedUser(c: Context): AuthenticatedUser {
  const user = c.get('user');
  if (!user || !user.id) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

export class TopListsController {
  constructor(private readonly service: TopListService) {}

  public create = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const body = c.get('validBody') as CreateTopListRequestDto;

    const topList = await this.service.createTopList({
      title: body.title,
      description: body.description,
      slug: body.slug,
      category: body.category,
      featured: body.featured,
      createdBy: user.id,
    });

    return c.json(mapTopListToResponse(topList), 201);
  };

  public update = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;
    const body = c.get('validBody') as UpdateTopListRequestDto;

    const updated = await this.service.updateTopList(params.id, {
      title: body.title,
      description: body.description,
      featured: body.featured,
    });

    return c.json(mapTopListToResponse(updated), 200);
  };

  public getById = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as TopListIdParamsDto;
    const topList = await this.service.getTopList(params.id);
    return c.json(mapTopListToResponse(topList), 200);
  };

  public delete = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;

    await this.service.deleteTopList(params.id);
    return c.body(null, 204);
  };

  public addItem = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;
    const body = c.get('validBody') as AddTopListItemRequestDto;

    await this.service.addItemToTopList(params.id, {
      ownerType: body.ownerType,
      ownerId: body.ownerId,
    });

    const updated = await this.service.getTopList(params.id);
    return c.json(mapTopListToResponse(updated), 200);
  };

  public removeItem = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListItemIdParamsDto;

    await this.service.removeItemFromTopList(params.id, params.itemId);

    const updated = await this.service.getTopList(params.id);
    return c.json(mapTopListToResponse(updated), 200);
  };

  public reorderItems = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;
    const body = c.get('validBody') as ReorderTopListItemsRequestDto;

    await this.service.reorderTopListItems(params.id, body.items);

    const updated = await this.service.getTopList(params.id);
    return c.json(mapTopListToResponse(updated), 200);
  };

  public publish = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;

    const updated = await this.service.publishTopList(params.id);
    return c.json(mapTopListToResponse(updated), 200);
  };

  public archive = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as TopListIdParamsDto;

    const updated = await this.service.archiveTopList(params.id);
    return c.json(mapTopListToResponse(updated), 200);
  };

  public list = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as TopListFilterQueryDto;

    const result = await this.service.listTopLists({
      filters: {
        category: query.category,
        status: query.status,
        featured: query.featured,
        search: query.search,
      },
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    });

    const mapped = result.items.map(mapTopListToResponse);

    return c.json(
      {
        data: mapped,
        meta: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
        },
      },
      200
    );
  };
}
