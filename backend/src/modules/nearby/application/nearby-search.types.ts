import type { NearbyEntityType } from '../repository/nearby-projection';

export interface NearbySearchInput {
  latitude: string | number;
  longitude: string | number;
  radiusMeters?: number;
  entityTypes?: readonly string[];
  regionId?: string;
  categoryId?: string;
  minRating?: string | number;
  limit?: number;
  cursor?: string;
}

export interface NearbySearchItem {
  entityType: NearbyEntityType;
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  region: {
    id: string;
    name: string;
    slug: string;
  } | null;
  thumbnailUrl: string | null;
  rating: {
    average: number | null;
    count: number;
  };
}

export interface NearbySearchResult {
  items: NearbySearchItem[];
  pagination: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  meta: {
    origin: {
      latitude: number;
      longitude: number;
    };
    radiusMeters: number;
  };
}
