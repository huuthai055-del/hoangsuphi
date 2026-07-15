import type { NearbySearchResult } from '../application/nearby-search.types';

export interface NearbyResponseItemDto {
  entityType: 'TOURIST_PLACE' | 'ATTRACTION' | 'BUSINESS' | 'UTILITY';
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

export interface NearbyResponseDto {
  data: NearbyResponseItemDto[];
  meta: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    totalReturned: number;
    origin: {
      latitude: number;
      longitude: number;
    };
    radiusMeters: number;
  };
  error: null;
}

export function mapNearbySearchResponse(
  result: NearbySearchResult,
  cursor: string | null
): NearbyResponseDto {
  return {
    data: result.items.map((item) => ({
      entityType: item.entityType,
      id: item.id,
      name: item.name,
      slug: item.slug,
      latitude: item.latitude,
      longitude: item.longitude,
      distanceMeters: item.distanceMeters,
      region: item.region
        ? {
            id: item.region.id,
            name: item.region.name,
            slug: item.region.slug,
          }
        : null,
      thumbnailUrl: item.thumbnailUrl,
      rating: {
        average: item.rating.average,
        count: item.rating.count,
      },
    })),
    meta: {
      cursor,
      nextCursor: result.pagination.nextCursor,
      hasMore: result.pagination.hasNextPage,
      totalReturned: result.items.length,
      origin: {
        latitude: result.meta.origin.latitude,
        longitude: result.meta.origin.longitude,
      },
      radiusMeters: result.meta.radiusMeters,
    },
    error: null,
  };
}
