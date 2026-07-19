import { ValidationError } from '@/common/errors/http.errors';
import type { Context } from 'hono';
import { HarvestRegionParamsSchema, parseHarvestPublicQuery } from '../dto/harvest-status.public.dto';
import type { HarvestStatusPublicService } from './harvest-status.public.service';

export class HarvestStatusPublicController {
  constructor(private readonly service: HarvestStatusPublicService) {}

  public current = async (c: Context): Promise<Response> => {
    const query = parseHarvestPublicQuery(new URL(c.req.url).searchParams);
    return c.json(await this.service.getCurrent(query), 200);
  };

  public regionTimeline = async (c: Context): Promise<Response> => {
    const parsed = HarvestRegionParamsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      const details = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0] ?? 'slug'), issue.message])
      );
      throw new ValidationError('Invalid Harvest Status region slug', details);
    }
    const query = parseHarvestPublicQuery(new URL(c.req.url).searchParams);
    return c.json(await this.service.getRegionTimeline(parsed.data.slug, query), 200);
  };
}
