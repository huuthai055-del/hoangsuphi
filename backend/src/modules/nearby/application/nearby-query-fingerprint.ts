import { createHash } from 'node:crypto';
import type { NearbyEntityType } from '../repository/nearby-projection';

const FINGERPRINT_VERSION = 1;

export interface CanonicalNearbyQuery {
  readonly lat: string;
  readonly lng: string;
  readonly radius: number;
  readonly types: readonly NearbyEntityType[];
  readonly regionId: string | null;
  readonly categoryId: string | null;
  readonly minRating: string | null;
  readonly limit: number;
  readonly sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC';
}

export function buildNearbyQueryFingerprint(query: CanonicalNearbyQuery): string {
  const canonicalRequest = JSON.stringify({
    v: FINGERPRINT_VERSION,
    lat: query.lat,
    lng: query.lng,
    radius: query.radius,
    types: query.types,
    regionId: query.regionId,
    categoryId: query.categoryId,
    minRating: query.minRating,
    limit: query.limit,
    sort: query.sort,
  });
  return createHash('sha256').update(canonicalRequest).digest('hex');
}
