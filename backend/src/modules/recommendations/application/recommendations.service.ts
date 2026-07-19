import { NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { buildCanonicalEntityUrl } from '@/common/utils/canonical-url';
import type {
  RecommendationsQueryDto,
  RecommendationsResponseDto,
  RecommendationItemDto,
} from '../dto/recommendations.dto';
import type { IRecommendationsRepository } from '../repository/recommendations-repository.interface';
import type { RecommendationReadProjection } from '../repository/recommendation-projection';

export class RecommendationProjectionInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationProjectionInvariantError';
  }
}

export class RecommendationSourceNotFoundError extends NotFoundError {
  constructor() {
    super('RECOMMENDATION_SOURCE_NOT_FOUND_OR_UNAVAILABLE');
    this.name = 'RecommendationSourceNotFoundError';
  }
}

export class RecommendationsService {
  constructor(private readonly repository: IRecommendationsRepository) {}

  public async getRecommendations(
    query: RecommendationsQueryDto
  ): Promise<RecommendationsResponseDto> {
    const { strategy, limit, sourceType, sourceId } = query;

    let items: RecommendationReadProjection[] = [];

    if (strategy === 'nearby' || strategy === 'same_region') {
      if (!sourceType || !sourceId) {
        throw new ValidationError('RECOMMENDATION_SOURCE_REQUIRED');
      }

      // Query 1: Resolve the public source
      const sourceProjection = await this.repository.resolvePublicSource(sourceType, sourceId);
      if (!sourceProjection) {
        throw new RecommendationSourceNotFoundError();
      }

      // Query 2: Fetch recommendations
      if (strategy === 'nearby') {
        items = await this.repository.findNearby({ limit, sourceId, sourceProjection });
      } else {
        items = await this.repository.findSameRegion({ limit, sourceId, sourceProjection });
      }
    } else if (strategy === 'top_rated') {
      items = await this.repository.findTopRated({ limit });
    } else if (strategy === 'newest') {
      items = await this.repository.findNewest({ limit });
    }

    return this.mapToResponse(query, items);
  }

  private mapToResponse(
    query: RecommendationsQueryDto,
    items: RecommendationReadProjection[]
  ): RecommendationsResponseDto {
    const mappedItems: RecommendationItemDto[] = items.map((item) => {
      const url = buildCanonicalEntityUrl(item.entityType, item.slug);

      return {
        entityType: item.entityType,
        id: item.id,
        name: item.name,
        slug: item.slug,
        url,
        thumbnailUrl: this.toPublicThumbnailUrl(item.thumbnailUrl),
        region: this.toRegion(item),
        rating: {
          average: item.ratingAverage,
          count: item.ratingCount,
        },
        distanceMeters: item.distanceMeters,
      };
    });

    return {
      data: mappedItems,
      meta: {
        strategy: query.strategy,
        limit: query.limit,
        source:
          query.sourceType && query.sourceId
            ? { type: query.sourceType, id: query.sourceId }
            : null,
      },
      error: null,
    };
  }

  private toRegion(item: RecommendationReadProjection): RecommendationItemDto['region'] {
    if (item.regionId === null) return null;
    if (item.regionName === null || item.regionSlug === null) {
      throw new RecommendationProjectionInvariantError(
        'Recommendation projection has an incomplete region'
      );
    }
    return {
      id: item.regionId,
      name: item.regionName,
      slug: item.regionSlug,
    };
  }

  private toPublicThumbnailUrl(value: string | null): string | null {
    if (value === null || value.length > 2048) return null;
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        url.username.length > 0 ||
        url.password.length > 0 ||
        url.hostname.length === 0
      ) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
}
