import type { RecommendationSourceType } from '../dto/recommendations.dto';

export type RecommendationEntityType = 'ARTICLE' | 'PLACE' | 'BUSINESS' | 'ATTRACTION';

export interface RecommendationReadProjection {
  entityType: RecommendationEntityType;
  id: string;
  name: string;
  slug: string;
  /** Public-facing image candidate. The service must fail closed unless it is a safe HTTPS URL. */
  thumbnailUrl: string | null;
  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  distanceMeters: number | null;
}

export interface RecommendationSourceProjection {
  sourceType: RecommendationSourceType;
  id: string;
  regionId: string | null;
  location: { x: number; y: number } | null; // PostGIS Point (longitude, latitude)
}
