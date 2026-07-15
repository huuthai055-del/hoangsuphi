export type NearbyEntityType = 'TOURIST_PLACE' | 'ATTRACTION' | 'BUSINESS' | 'UTILITY';

export interface NearbyResultProjection {
  entityType: NearbyEntityType;
  entityTypeRank: number;
  entityId: string;

  name: string;
  slug: string;

  latitude: number;
  longitude: number;

  rawDistanceMeters: string;
  displayDistanceMeters: number;

  regionId: string | null;
  regionName: string | null;
  regionSlug: string | null;

  thumbnailUrl: string | null;

  averageRating: string | null;
  reviewCount: number;
}
