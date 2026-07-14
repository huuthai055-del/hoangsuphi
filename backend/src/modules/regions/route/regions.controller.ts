import type { Context } from 'hono';
import type { RegionsService } from '../service/regions.service';
import type { Region } from '../domain/region.aggregate';
import type {
  CreateRegionRequestDto,
  UpdateRegionRequestDto,
  ListRegionsQueryDto,
  RegionIdParamsDto,
  RegionSlugParamsDto,
  RegionResponseDto,
} from '../dto/regions.dto';

export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  private mapToResponse(region: Region): RegionResponseDto {
    return {
      id: region.id,
      parentId: region.parentId,
      name: region.name,
      slug: region.slug,
      level: region.level,
      path: region.path.getValue(),
      latitude: region.latitude,
      longitude: region.longitude,
      center: region.geom ? { lng: region.geom.lng, lat: region.geom.lat } : null,
      description: region.description,
      status: region.status,
      createdAt: region.createdAt.toISOString(),
      updatedAt: region.updatedAt.toISOString(),
    };
  }

  public list = async (c: Context) => {
    const query = c.get('validQuery') as ListRegionsQueryDto;

    const { items, total } = await this.regionsService.listRegions({
      page: query.page,
      limit: query.limit,
      parentId: query.parentId,
      level: query.level,
    });

    const mapped = items.map((r) => this.mapToResponse(r));

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
    const params = c.get('validParams') as RegionIdParamsDto;
    const region = await this.regionsService.getRegionDetail(params.id);
    return c.json(this.mapToResponse(region), 200);
  };

  public getBySlug = async (c: Context) => {
    const params = c.get('validParams') as RegionSlugParamsDto;
    const region = await this.regionsService.getRegionDetail(params.slug);
    return c.json(this.mapToResponse(region), 200);
  };

  public create = async (c: Context) => {
    const body = c.get('validBody') as CreateRegionRequestDto;

    const region = await this.regionsService.createRegion({
      name: body.name,
      slug: body.slug,
      parentId: body.parentId,
      level: body.level,
      latitude: body.latitude,
      longitude: body.longitude,
      center: body.center,
      description: body.description,
    });

    return c.json(this.mapToResponse(region), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as RegionIdParamsDto;
    const body = c.get('validBody') as UpdateRegionRequestDto;

    const region = await this.regionsService.updateRegion(params.id, {
      parentId: body.parentId,
      name: body.name,
      description: body.description,
      latitude: body.latitude,
      longitude: body.longitude,
      center: body.center,
      status: body.status,
    });

    return c.json(this.mapToResponse(region), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as RegionIdParamsDto;
    await this.regionsService.deleteRegion(params.id);
    return c.body(null, 204);
  };

  public activate = async (c: Context) => {
    const params = c.get('validParams') as RegionIdParamsDto;
    const region = await this.regionsService.activateRegion(params.id);
    return c.json(this.mapToResponse(region), 200);
  };

  public deactivate = async (c: Context) => {
    const params = c.get('validParams') as RegionIdParamsDto;
    const region = await this.regionsService.deactivateRegion(params.id);
    return c.json(this.mapToResponse(region), 200);
  };
}
