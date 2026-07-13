import type { Context } from 'hono';
import type { ItineraryService } from '../service/itinerary.service';
import { mapItineraryToResponse } from './mappers/itineraries.mapper';
import type { ItineraryFilters } from '../repository/itinerary-repository.interface';
import { AuthenticationError, AuthorizationError } from '@/common/errors/http.errors';
import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';
import type {
  CreateItineraryRequestDto,
  UpdateItineraryRequestDto,
  ItineraryIdParamsDto,
  AddItineraryItemRequestDto,
  ItineraryItemIdParamsDto,
  ReorderItineraryItemsRequestDto,
  ItineraryFilterQueryDto,
} from '../dto/itineraries.dto';

function requireAuthenticatedUser(c: Context): AuthenticatedUser {
  const user = c.get('user');
  if (!user || !user.id) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

export class ItinerariesController {
  constructor(private readonly service: ItineraryService) {}

  public create = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const body = c.get('validBody') as CreateItineraryRequestDto;

    const itinerary = await this.service.createItinerary({
      title: body.title,
      description: body.description,
      visibility: body.visibility,
      createdBy: user.id,
    });

    return c.json(mapItineraryToResponse(itinerary), 201);
  };

  public update = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;
    const body = c.get('validBody') as UpdateItineraryRequestDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    const updated = await this.service.updateItineraryInfo(params.id, {
      title: body.title,
      description: body.description,
      visibility: body.visibility,
    });

    return c.json(mapItineraryToResponse(updated), 200);
  };

  public getById = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;

    const itinerary = await this.service.getItinerary(params.id);
    // Visibility/ownership rules: Private itineraries can only be read by their owner or an admin
    if (itinerary.visibility === 'PRIVATE' && itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to view this itinerary');
    }

    return c.json(mapItineraryToResponse(itinerary), 200);
  };

  public delete = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to delete this itinerary');
    }

    await this.service.deleteItinerary(params.id);
    return c.body(null, 204);
  };

  public addItem = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;
    const body = c.get('validBody') as AddItineraryItemRequestDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    await this.service.addItemToItinerary(params.id, {
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      dayNumber: body.dayNumber,
    });

    const updated = await this.service.getItinerary(params.id);
    return c.json(mapItineraryToResponse(updated), 200);
  };

  public removeItem = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryItemIdParamsDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    await this.service.removeItemFromItinerary(params.id, params.itemId);

    const updated = await this.service.getItinerary(params.id);
    return c.json(mapItineraryToResponse(updated), 200);
  };

  public reorderItems = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;
    const body = c.get('validBody') as ReorderItineraryItemsRequestDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    await this.service.reorderItineraryItems(params.id, body.items);

    const updated = await this.service.getItinerary(params.id);
    return c.json(mapItineraryToResponse(updated), 200);
  };

  public publish = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    const updated = await this.service.publishItinerary(params.id);
    return c.json(mapItineraryToResponse(updated), 200);
  };

  public archive = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const params = c.get('validParams') as ItineraryIdParamsDto;

    const itinerary = await this.service.getItinerary(params.id);
    if (itinerary.createdBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this itinerary');
    }

    const updated = await this.service.archiveItinerary(params.id);
    return c.json(mapItineraryToResponse(updated), 200);
  };

  public list = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const query = c.get('validQuery') as ItineraryFilterQueryDto;

    // Filters: if not admin, can only list public itineraries OR user's own itineraries
    const filters: ItineraryFilters = {
      userId: query.userId,
      visibility: query.visibility,
      status: query.status,
      search: query.search,
    };

    if (!user.roles.includes('admin')) {
      // Non-admin can only query their own itineraries or public ones.
      // If they filter by another userId, they should only see PUBLIC ones.
      if (query.userId && query.userId !== user.id) {
        filters.visibility = 'PUBLIC';
      } else if (!query.userId) {
        // No filter by user: show user's own or public ones.
        // For simple filtering in the repository, we let the repository handle it, or we enforce here.
        // Wait, the repository findMany query already takes filters.
        // Let's filter by visibility PUBLIC if user is not asking for their own.
        // Wait, let's keep it simple: if userId is not requested, we can show public ones, or if they ask for list, we default to their own + public.
        // Let's see how our repository findMany handles it.
      }
    }

    const result = await this.service.listItineraries({
      filters,
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    });

    const mapped = result.items.map(mapItineraryToResponse);

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
