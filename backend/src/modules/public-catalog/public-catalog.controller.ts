import type { Context } from 'hono';
import {
  parseCatalogKind,
  parsePublicCatalogListQuery,
  parsePublicSlug,
  parseReferenceKind,
} from './public-catalog.dto';
import { PublicCatalogNotFoundError } from './public-catalog.errors';
import type { PublicCatalogService } from './public-catalog.service';

export class PublicCatalogController {
  constructor(private readonly service: PublicCatalogService) {}

  list = async (c: Context): Promise<Response> => {
    const kind = parseCatalogKind(c.req.param('kind') ?? '');
    if (!kind) throw new PublicCatalogNotFoundError();
    const query = parsePublicCatalogListQuery(kind, new URL(c.req.url).searchParams);
    return c.json(await this.service.list(query), 200);
  };

  detail = async (c: Context): Promise<Response> => {
    const kind = parseCatalogKind(c.req.param('kind') ?? '');
    if (!kind) throw new PublicCatalogNotFoundError();
    const slug = parsePublicSlug(c.req.param('slug'));
    return c.json(await this.service.detail(kind, slug), 200);
  };

  references = async (c: Context): Promise<Response> => {
    const kind = parseReferenceKind(c.req.param('kind') ?? '');
    if (!kind) throw new PublicCatalogNotFoundError();
    return c.json(await this.service.references(kind), 200);
  };
}
