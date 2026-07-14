import type { Context } from 'hono';
import type { AttractionsService } from '../service/attractions.service';
import type { Attraction } from '../domain/attraction.entity';
import type {
  CreateAttractionRequestDto,
  UpdateAttractionRequestDto,
  ListAttractionsQueryDto,
  AttractionNearbyQueryDto,
  AttractionIdParamsDto,
  AttractionSlugParamsDto,
  AttractionResponseDto,
  AttractionSummaryResponseDto,
} from '../dto/attractions.dto';

export class AttractionsController {
  constructor(private readonly service: AttractionsService) {}

  private mapToResponse(attraction: Attraction): AttractionResponseDto {
    return {
      id: attraction.id,
      regionId: attraction.regionId,
      categoryId: attraction.categoryId,
      name: attraction.name,
      slug: attraction.slug,
      location: { lng: attraction.location.lng, lat: attraction.location.lat },
      description: attraction.description,
      coverUrl: attraction.coverUrl,
      status: attraction.status,
      createdAt: attraction.createdAt.toISOString(),
      updatedAt: attraction.updatedAt.toISOString(),
    };
  }

  private mapToSummary(attraction: Attraction): AttractionSummaryResponseDto {
    return {
      id: attraction.id,
      regionId: attraction.regionId,
      categoryId: attraction.categoryId,
      name: attraction.name,
      slug: attraction.slug,
      location: { lng: attraction.location.lng, lat: attraction.location.lat },
      coverUrl: attraction.coverUrl,
      status: attraction.status,
    };
  }

  public list = async (c: Context) => {
    const query = c.get('validQuery') as ListAttractionsQueryDto;

    const { items, total } = await this.service.listAttractions({
      page: query.page,
      limit: query.limit,
      regionId: query.regionId,
      categoryId: query.categoryId,
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
    const params = c.get('validParams') as AttractionIdParamsDto;
    const attraction = await this.service.getAttractionById(params.id);
    return c.json(this.mapToResponse(attraction), 200);
  };

  public getBySlug = async (c: Context) => {
    const params = c.get('validParams') as AttractionSlugParamsDto;
    const attraction = await this.service.getAttractionBySlug(params.slug);
    return c.json(this.mapToResponse(attraction), 200);
  };

  public listByRegion = async (c: Context) => {
    const params = c.get('validParams') as { regionId: string };
    const query = c.get('validQuery') as ListAttractionsQueryDto;

    const results = await this.service.listAttractionsByRegion(params.regionId, {
      page: query.page,
      limit: query.limit,
    });

    const mapped = results.map((r) => this.mapToSummary(r));
    return c.json({ data: mapped }, 200);
  };

  public searchNearby = async (c: Context) => {
    const query = c.get('validQuery') as AttractionNearbyQueryDto;

    const results = await this.service.searchNearby(
      query.lng,
      query.lat,
      query.radius,
      query.limit
    );

    const mapped = results.map((r) => this.mapToSummary(r));
    return c.json({ data: mapped }, 200);
  };

  public create = async (c: Context) => {
    const body = c.get('validBody') as CreateAttractionRequestDto;

    const attraction = await this.service.createAttraction({
      regionId: body.regionId,
      categoryId: body.categoryId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
    });

    return c.json(this.mapToResponse(attraction), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as AttractionIdParamsDto;
    const body = c.get('validBody') as UpdateAttractionRequestDto;

    const attraction = await this.service.updateAttraction(params.id, {
      regionId: body.regionId,
      categoryId: body.categoryId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
      status: body.status,
    });

    return c.json(this.mapToResponse(attraction), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as AttractionIdParamsDto;
    await this.service.deleteAttraction(params.id);
    return c.body(null, 204);
  };

  public activate = async (c: Context) => {
    const params = c.get('validParams') as AttractionIdParamsDto;
    const attraction = await this.service.activateAttraction(params.id);
    return c.json(this.mapToResponse(attraction), 200);
  };

  public deactivate = async (c: Context) => {
    const params = c.get('validParams') as AttractionIdParamsDto;
    const attraction = await this.service.deactivateAttraction(params.id);
    return c.json(this.mapToResponse(attraction), 200);
  };
}
