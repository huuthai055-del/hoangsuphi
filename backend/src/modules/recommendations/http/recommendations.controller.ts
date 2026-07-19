import type { Context } from 'hono';
import type { RecommendationsService } from '../application/recommendations.service';
import { parseRecommendationsQuery } from '../dto/recommendations.dto';

export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  public getRecommendations = async (c: Context): Promise<Response> => {
    // Hono's `c.req.query()` discards duplicate keys. Read URLSearchParams directly so strict DTO
    // validation can reject parameter pollution instead of silently accepting a first value.
    const queryDto = parseRecommendationsQuery(new URL(c.req.url).searchParams);
    const responseDto = await this.recommendationsService.getRecommendations(queryDto);

    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json(responseDto, 200);
  };
}
