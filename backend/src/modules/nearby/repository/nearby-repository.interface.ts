import type { NearbyEntityType, NearbyResultProjection } from './nearby-projection';

export interface NearbySearchCriteria {
  latitude: string;
  longitude: string;
  radiusMeters: number;

  entityTypes: readonly NearbyEntityType[];

  regionId?: string;
  categoryId?: string;
  minRating?: string;

  limit: number;

  after?: {
    rawDistanceMeters: string;
    entityType: NearbyEntityType;
    entityTypeRank: number;
    entityId: string;
  };
}

export interface NearbyRepositoryPage {
  items: NearbyResultProjection[];
}

export interface NearbyReferenceFilter {
  regionId?: string;
  categoryId?: string;
  categoryType?: 'attraction' | 'business';
}

export type NearbyRegionReferenceStatus = 'not_requested' | 'valid' | 'missing' | 'deleted';
export type NearbyCategoryReferenceStatus = 'not_requested' | 'valid' | 'missing';
export type NearbyBusinessTypeReferenceStatus = 'not_requested' | 'valid' | 'missing' | 'inactive';

export interface NearbyReferenceValidation {
  region: NearbyRegionReferenceStatus;
  category: NearbyCategoryReferenceStatus;
  businessType: NearbyBusinessTypeReferenceStatus;
}

export interface INearbyRepository {
  searchNearby(criteria: NearbySearchCriteria): Promise<NearbyRepositoryPage>;
  validateReferences(filters: NearbyReferenceFilter): Promise<NearbyReferenceValidation>;
}
