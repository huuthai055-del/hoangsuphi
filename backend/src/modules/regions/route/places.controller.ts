import type { Context } from 'hono';
import type { PlacesService } from '../service/places.service';
import type { TouristPlace } from '../domain/place.entity';
import type {
  CreatePlaceRequestDto,
  UpdatePlaceRequestDto,
  ListPlacesQueryDto,
  PlaceNearbyQueryDto,
  PlaceIdParamsDto,
  PlaceSlugParamsDto,
  PlaceResponseDto,
  PlaceSummaryResponseDto,
} from '../dto/places.dto';

export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  private mapToResponse(place: TouristPlace): PlaceResponseDto {
    return {
      id: place.id,
      regionId: place.regionId,
      name: place.name,
      slug: place.slug,
      location: { lng: place.location.lng, lat: place.location.lat },
      description: place.description,
      coverUrl: place.coverUrl,
      status: place.status,
      createdAt: place.createdAt.toISOString(),
      updatedAt: place.updatedAt.toISOString(),
    };
  }

  private mapToSummary(place: TouristPlace): PlaceSummaryResponseDto {
    return {
      id: place.id,
      regionId: place.regionId,
      name: place.name,
      slug: place.slug,
      location: { lng: place.location.lng, lat: place.location.lat },
      coverUrl: place.coverUrl,
      status: place.status,
    };
  }

  public list = async (c: Context) => {
    const query = c.get('validQuery') as ListPlacesQueryDto;

    const { items, total } = await this.placesService.listPlaces({
      page: query.page,
      limit: query.limit,
      regionId: query.regionId,
      status: query.status,
    });

    const mapped = items.map((r) => this.mapToSummary(r));

    return c.json(
      {
        data: mapped,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      },
      200
    );
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as PlaceIdParamsDto;
    const place = await this.placesService.getPlaceById(params.id);
    return c.json(this.mapToResponse(place), 200);
  };

  public getBySlug = async (c: Context) => {
    const params = c.get('validParams') as PlaceSlugParamsDto;
    const place = await this.placesService.getPlaceBySlug(params.slug);
    return c.json(this.mapToResponse(place), 200);
  };

  public listByRegion = async (c: Context) => {
    const params = c.get('validParams') as { regionId: string };
    const query = c.get('validQuery') as ListPlacesQueryDto;

    const results = await this.placesService.listPlacesByRegion(params.regionId, {
      page: query.page,
      limit: query.limit,
    });

    const mapped = results.map((r) => this.mapToSummary(r));
    return c.json({ data: mapped }, 200);
  };

  public searchNearby = async (c: Context) => {
    const query = c.get('validQuery') as PlaceNearbyQueryDto;

    const results = await this.placesService.searchNearby(
      query.lng,
      query.lat,
      query.radius,
      query.limit
    );

    const mapped = results.map((r) => this.mapToSummary(r));
    return c.json({ data: mapped }, 200);
  };

  public create = async (c: Context) => {
    const body = c.get('validBody') as CreatePlaceRequestDto;

    const place = await this.placesService.createPlace({
      regionId: body.regionId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
    });

    return c.json(this.mapToResponse(place), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as PlaceIdParamsDto;
    const body = c.get('validBody') as UpdatePlaceRequestDto;

    const place = await this.placesService.updatePlace(params.id, {
      regionId: body.regionId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
      status: body.status,
    });

    return c.json(this.mapToResponse(place), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as PlaceIdParamsDto;
    await this.placesService.deletePlace(params.id);
    return c.body(null, 204);
  };

  public activate = async (c: Context) => {
    const params = c.get('validParams') as PlaceIdParamsDto;
    const place = await this.placesService.activatePlace(params.id);
    return c.json(this.mapToResponse(place), 200);
  };

  public deactivate = async (c: Context) => {
    const params = c.get('validParams') as PlaceIdParamsDto;
    const place = await this.placesService.deactivatePlace(params.id);
    return c.json(this.mapToResponse(place), 200);
  };
}
