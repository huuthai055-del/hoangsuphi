import type { Context } from 'hono';
import type {
  CreateRedirectDto,
  ListRedirectsQueryDto,
  ResolveRedirectQueryDto,
  UpdateRedirectDto,
} from '../dto/redirects.dto';
import type { Redirect } from '../domain/redirect.entity';
import type { IRedirectsService } from '../service/redirects.service';

export class RedirectsController {
  constructor(private readonly redirectsService: IRedirectsService) {}

  public list = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as ListRedirectsQueryDto;
    const result = await this.redirectsService.listRedirects(query);
    return c.json({
      data: result.items.map(toRedirectResponse),
      meta: { nextCursor: result.nextCursor },
    });
  };

  public getById = async (c: Context): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    const redirect = await this.redirectsService.getRedirectById(id);
    return c.json({ data: toRedirectResponse(redirect) });
  };

  public create = async (c: Context): Promise<Response> => {
    const dto = c.get('validBody') as CreateRedirectDto;
    const redirect = await this.redirectsService.createRedirect(dto, c.get('user').id);
    return c.json({ data: toRedirectResponse(redirect) }, 201);
  };

  public update = async (c: Context): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    const dto = c.get('validBody') as UpdateRedirectDto;
    const redirect = await this.redirectsService.updateRedirect(id, dto, c.get('user').id);
    return c.json({ data: toRedirectResponse(redirect) });
  };

  public delete = async (c: Context): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    await this.redirectsService.deleteRedirect(id, c.get('user').id);
    return c.body(null, 204);
  };

  public resolve = async (c: Context): Promise<Response> => {
    const { path } = c.get('validQuery') as ResolveRedirectQueryDto;
    const resolution = await this.redirectsService.resolveRedirect(path);
    c.header('Cache-Control', 'no-store');
    return c.json({ data: resolution });
  };
}

function toRedirectResponse(redirect: Redirect) {
  return {
    id: redirect.id,
    sourcePath: redirect.sourcePath,
    targetPath: redirect.targetPath,
    statusCode: redirect.statusCode,
    isActive: redirect.isActive,
    createdBy: redirect.createdBy,
    createdAt: redirect.createdAt.toISOString(),
    updatedAt: redirect.updatedAt.toISOString(),
  };
}
