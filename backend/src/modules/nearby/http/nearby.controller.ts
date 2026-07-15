import { DatabaseError, ValidationError } from '@/common/errors/http.errors';
import type { Context } from 'hono';
import type { NearbySearchInput, NearbySearchResult } from '../application/nearby-search.types';
import type { NearbySearchQueryDto } from '../dto/nearby.dto';
import { mapNearbySearchResponse } from './nearby-response.mapper';

export interface NearbySearchService {
  search(input: NearbySearchInput): Promise<NearbySearchResult>;
}

export class NearbyController {
  constructor(private readonly service: NearbySearchService) {}

  public search = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as NearbySearchQueryDto;
    try {
      const result = await this.service.search({
        latitude: query.lat,
        longitude: query.lng,
        radiusMeters: query.radius,
        entityTypes: query.types,
        regionId: query.regionId,
        categoryId: query.categoryId,
        minRating: query.minRating,
        limit: query.limit,
        cursor: query.cursor,
      });
      return c.json(mapNearbySearchResponse(result, query.cursor ?? null), 200);
    } catch (error) {
      if (error instanceof ValidationError) {
        const mappedDetails: Record<string, unknown> = {};
        if (error.details) {
          for (const [key, val] of Object.entries(error.details)) {
            const mappedKey =
              key === 'latitude'
                ? 'lat'
                : key === 'longitude'
                  ? 'lng'
                  : key === 'radiusMeters'
                    ? 'radius'
                    : key === 'entityTypes'
                      ? 'types'
                      : key;
            mappedDetails[mappedKey] = val;
          }
        }
        const ErrorCtor = error.constructor as new (
          message: string,
          details?: Record<string, unknown>
        ) => ValidationError;
        throw new ErrorCtor(error.message, mappedDetails);
      }
      throw new DatabaseError(
        'Nearby search service failed to execute',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };
}
