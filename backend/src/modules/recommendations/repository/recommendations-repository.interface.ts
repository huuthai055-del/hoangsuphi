import type {
  RecommendationReadProjection,
  RecommendationSourceProjection,
} from './recommendation-projection';
import type { RecommendationSourceType } from '../dto/recommendations.dto';

export interface RecommendationQueryCriteria {
  limit: number;
  sourceType?: RecommendationSourceType;
  sourceId?: string;
  sourceProjection?: RecommendationSourceProjection;
}

export interface IRecommendationsRepository {
  /**
   * Resolves the source entity to check if it exists, is active/public, is not soft-deleted,
   * and retrieves its location and regionId for further queries.
   * If it doesn't meet the criteria, returns null.
   */
  resolvePublicSource(
    sourceType: RecommendationSourceType,
    sourceId: string
  ): Promise<RecommendationSourceProjection | null>;

  /**
   * Strategy: 'nearby'
   * Finds places, businesses, attractions closest to the source entity using PostGIS.
   */
  findNearby(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]>;

  /**
   * Strategy: 'same_region'
   * Finds places, businesses, attractions that belong to the exact same region as the source entity.
   */
  findSameRegion(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]>;

  /**
   * Strategy: 'top_rated'
   * Finds articles, places, businesses, attractions with at least 1 approved review,
   * sorted by rating average DESC, rating count DESC, timestamp DESC.
   */
  findTopRated(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]>;

  /**
   * Strategy: 'newest'
   * Finds the newest articles, places, businesses, attractions based on their publication/creation timestamp.
   */
  findNewest(criteria: RecommendationQueryCriteria): Promise<RecommendationReadProjection[]>;
}
