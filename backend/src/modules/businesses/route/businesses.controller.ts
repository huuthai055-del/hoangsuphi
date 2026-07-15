import type { Context } from 'hono';
import type { Business } from '../domain/business.entity';
import type {
  BusinessIdParamsDto,
  BusinessNearbyQueryDto,
  BusinessResponseDto,
  BusinessSlugParamsDto,
  BusinessSummaryResponseDto,
  CreateBusinessRequestDto,
  ListBusinessesQueryDto,
  UpdateBusinessRequestDto,
} from '../dto/businesses.dto';
import type { BusinessesService } from '../service/businesses.service';

export class BusinessesController {
  constructor(private readonly service: BusinessesService) {}

  private mapToResponse(business: Business): BusinessResponseDto {
    return {
      id: business.id,
      regionId: business.regionId,
      businessTypeId: business.businessTypeId,
      name: business.name,
      slug: business.slug,
      location: { lng: business.location.lng, lat: business.location.lat },
      description: business.description,
      coverUrl: business.coverUrl,
      priceMin: business.priceMin,
      priceMax: business.priceMax,
      status: business.status,
      amenityIds: business.amenityIds,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }

  private mapToSummary(business: Business): BusinessSummaryResponseDto {
    return {
      id: business.id,
      regionId: business.regionId,
      businessTypeId: business.businessTypeId,
      name: business.name,
      slug: business.slug,
      location: { lng: business.location.lng, lat: business.location.lat },
      coverUrl: business.coverUrl,
      priceMin: business.priceMin,
      priceMax: business.priceMax,
      status: business.status,
      amenityIds: business.amenityIds,
    };
  }

  public list = async (c: Context) => {
    const query = c.get('validQuery') as ListBusinessesQueryDto;

    const { items, total } = await this.service.listBusinesses({
      page: query.page,
      limit: query.limit,
      regionId: query.regionId,
      businessTypeId: query.businessTypeId,
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
    const params = c.get('validParams') as BusinessIdParamsDto;
    const business = await this.service.getBusinessById(params.id);
    return c.json(this.mapToResponse(business), 200);
  };

  public getBySlug = async (c: Context) => {
    const params = c.get('validParams') as BusinessSlugParamsDto;
    const business = await this.service.getBusinessBySlug(params.slug);
    return c.json(this.mapToResponse(business), 200);
  };

  public listByRegion = async (c: Context) => {
    const params = c.get('validParams') as { regionId: string };
    const query = c.get('validQuery') as ListBusinessesQueryDto;

    const results = await this.service.listBusinessesByRegion(params.regionId, {
      page: query.page,
      limit: query.limit,
    });

    const mapped = results.map((r) => this.mapToSummary(r));
    return c.json({ data: mapped }, 200);
  };

  public searchNearby = async (c: Context) => {
    const query = c.get('validQuery') as BusinessNearbyQueryDto;

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
    const body = c.get('validBody') as CreateBusinessRequestDto;

    const business = await this.service.createBusiness({
      regionId: body.regionId,
      businessTypeId: body.businessTypeId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      amenityIds: body.amenityIds,
    });

    return c.json(this.mapToResponse(business), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as BusinessIdParamsDto;
    const body = c.get('validBody') as UpdateBusinessRequestDto;

    const business = await this.service.updateBusiness(params.id, {
      regionId: body.regionId,
      businessTypeId: body.businessTypeId,
      name: body.name,
      slug: body.slug,
      location: body.location,
      description: body.description,
      coverUrl: body.coverUrl,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      amenityIds: body.amenityIds,
      status: body.status,
    });

    return c.json(this.mapToResponse(business), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as BusinessIdParamsDto;
    await this.service.deleteBusiness(params.id);
    return c.body(null, 204);
  };

  public activate = async (c: Context) => {
    const params = c.get('validParams') as BusinessIdParamsDto;
    const business = await this.service.activateBusiness(params.id);
    return c.json(this.mapToResponse(business), 200);
  };

  public deactivate = async (c: Context) => {
    const params = c.get('validParams') as BusinessIdParamsDto;
    const business = await this.service.deactivateBusiness(params.id);
    return c.json(this.mapToResponse(business), 200);
  };
}
