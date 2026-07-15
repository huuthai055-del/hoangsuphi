import type { NearbyEntityType, NearbyResultProjection } from '../repository/nearby-projection';
import type { INearbyRepository } from '../repository/nearby-repository.interface';
import { NearbyValidationError } from './nearby-application.errors';
import type { INearbyCursorCodec, NearbyCursorPayload } from './nearby-cursor.codec';
import { type CanonicalNearbyQuery, buildNearbyQueryFingerprint } from './nearby-query-fingerprint';
import type {
  NearbySearchInput,
  NearbySearchItem,
  NearbySearchResult,
} from './nearby-search.types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RANK_MAPPING: Record<NearbyEntityType, number> = {
  TOURIST_PLACE: 1,
  ATTRACTION: 2,
  BUSINESS: 3,
  UTILITY: 4,
};

function toPublicThumbnailUrl(value: string | null): string | null {
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

function validateStrictDecimal(value: string | number, fieldName: string): string {
  const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !DECIMAL_PATTERN.test(trimmed)) {
      throw new NearbyValidationError(`Invalid decimal format for ${fieldName}`, {
        [fieldName]:
          'Must be a valid decimal number (hexadecimal, binary, and empty/whitespace values are not allowed)',
      });
    }
    return trimmed;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new NearbyValidationError(`Invalid decimal format for ${fieldName}`, {
        [fieldName]: 'Must be a finite number',
      });
    }
    return String(value);
  }
  throw new NearbyValidationError(`Invalid format for ${fieldName}`, {
    [fieldName]: 'Must be a string or number',
  });
}

export class NearbySearchService {
  constructor(
    private readonly repository: INearbyRepository,
    private readonly cursorCodec: INearbyCursorCodec
  ) {}

  async search(input: NearbySearchInput): Promise<NearbySearchResult> {
    // 1. Validate coordinates
    if (input.latitude === undefined || input.latitude === null) {
      throw new NearbyValidationError('Latitude is required', { latitude: 'Missing latitude' });
    }
    if (input.longitude === undefined || input.longitude === null) {
      throw new NearbyValidationError('Longitude is required', { longitude: 'Missing longitude' });
    }

    const latStr = validateStrictDecimal(input.latitude, 'latitude');
    const lngStr = validateStrictDecimal(input.longitude, 'longitude');

    if (latStr.toLowerCase().includes('e')) {
      throw new NearbyValidationError('Latitude format is invalid', {
        latitude: 'Scientific notation is not allowed',
      });
    }
    if (lngStr.toLowerCase().includes('e')) {
      throw new NearbyValidationError('Longitude format is invalid', {
        longitude: 'Scientific notation is not allowed',
      });
    }

    const latParts = latStr.split('.');
    if (latParts[1] && latParts[1].length > 6) {
      throw new NearbyValidationError('Latitude must have at most 6 decimal places', {
        latitude: 'Precision exceeds 6 decimal places',
      });
    }

    const lngParts = lngStr.split('.');
    if (lngParts[1] && lngParts[1].length > 6) {
      throw new NearbyValidationError('Longitude must have at most 6 decimal places', {
        longitude: 'Precision exceeds 6 decimal places',
      });
    }

    const latNum = Number(latStr);
    if (latNum < -90 || latNum > 90) {
      throw new NearbyValidationError('Latitude must be a valid number between -90 and 90', {
        latitude: 'Value out of bounds',
      });
    }

    const lngNum = Number(lngStr);
    if (lngNum < -180 || lngNum > 180) {
      throw new NearbyValidationError('Longitude must be a valid number between -180 and 180', {
        longitude: 'Value out of bounds',
      });
    }

    // Canonical representation for lat/lng strings (converts negative zero to 0)
    const latCanonical = (latNum === 0 ? 0 : latNum).toFixed(6);
    const lngCanonical = (lngNum === 0 ? 0 : lngNum).toFixed(6);

    // 2. Validate radius
    let resolvedRadius = 5000;
    if (input.radiusMeters !== undefined) {
      const radius = input.radiusMeters;
      if (typeof radius !== 'number' || !Number.isInteger(radius)) {
        throw new NearbyValidationError('Radius must be an integer', {
          radiusMeters: 'Must be an integer',
        });
      }
      if (String(radius).toLowerCase().includes('e')) {
        throw new NearbyValidationError('Scientific notation is not allowed for radius', {
          radiusMeters: 'Format is invalid',
        });
      }
      if (radius < 100 || radius > 50000) {
        throw new NearbyValidationError('Radius must be between 100 and 50000 meters', {
          radiusMeters: 'Value out of range',
        });
      }
      resolvedRadius = radius;
    }

    // 3. Validate limit
    let resolvedLimit = 20;
    if (input.limit !== undefined) {
      const limit = input.limit;
      if (typeof limit !== 'number' || !Number.isInteger(limit)) {
        throw new NearbyValidationError('Limit must be an integer', {
          limit: 'Must be an integer',
        });
      }
      if (String(limit).toLowerCase().includes('e')) {
        throw new NearbyValidationError('Scientific notation is not allowed for limit', {
          limit: 'Format is invalid',
        });
      }
      if (limit < 1 || limit > 50) {
        throw new NearbyValidationError('Limit must be between 1 and 50', {
          limit: 'Value out of range',
        });
      }
      resolvedLimit = limit;
    }

    // 4. Validate and normalize entityTypes
    let mappedTypes: readonly NearbyEntityType[] = [
      'TOURIST_PLACE',
      'ATTRACTION',
      'BUSINESS',
      'UTILITY',
    ];
    if (input.entityTypes !== undefined) {
      if (input.entityTypes.length === 0) {
        throw new NearbyValidationError('entityTypes must contain at least one value', {
          entityTypes: 'List cannot be empty',
        });
      }

      const seenTypes = new Set<string>();
      const normalizedBranchTypes: NearbyEntityType[] = [];

      for (const type of input.entityTypes) {
        if (seenTypes.has(type)) {
          throw new NearbyValidationError('Duplicate entity types are not allowed', {
            entityTypes: `Duplicate value: ${type}`,
          });
        }
        seenTypes.add(type);

        if (type === 'place') {
          normalizedBranchTypes.push('TOURIST_PLACE');
        } else if (type === 'attraction') {
          normalizedBranchTypes.push('ATTRACTION');
        } else if (type === 'business') {
          normalizedBranchTypes.push('BUSINESS');
        } else if (type === 'utility') {
          normalizedBranchTypes.push('UTILITY');
        } else {
          throw new NearbyValidationError(`Unknown entity type: ${type}`, {
            entityTypes: 'Invalid type specified',
          });
        }
      }

      // Sort by entity type rank
      normalizedBranchTypes.sort((a, b) => RANK_MAPPING[a] - RANK_MAPPING[b]);
      mappedTypes = normalizedBranchTypes;
    }

    // 5. Validate UUID filters
    let resolvedRegionId: string | null = null;
    if (input.regionId !== undefined) {
      if (typeof input.regionId !== 'string' || !UUID_PATTERN.test(input.regionId)) {
        throw new NearbyValidationError('Invalid region ID format', {
          regionId: 'Must be a valid UUID',
        });
      }
      resolvedRegionId = input.regionId.toLowerCase();
    }

    let resolvedCategoryId: string | null = null;
    if (input.categoryId !== undefined) {
      if (typeof input.categoryId !== 'string' || !UUID_PATTERN.test(input.categoryId)) {
        throw new NearbyValidationError('Invalid category ID format', {
          categoryId: 'Must be a valid UUID',
        });
      }
      resolvedCategoryId = input.categoryId.toLowerCase();
    }

    // 6. Category cross-field validation
    if (resolvedCategoryId !== null) {
      if (input.entityTypes === undefined) {
        throw new NearbyValidationError(
          'entityTypes must be explicitly specified when categoryId is provided',
          { entityTypes: 'Missing entityTypes' }
        );
      }
      if (mappedTypes.length !== 1) {
        throw new NearbyValidationError(
          'Exactly one entity type must be specified when categoryId is provided',
          { entityTypes: 'Must specify exactly one type' }
        );
      }
      const singleType = mappedTypes[0];
      if (singleType === 'TOURIST_PLACE') {
        throw new NearbyValidationError('Category filtering is not supported for TOURIST_PLACE', {
          entityTypes: 'Invalid type for category filter',
        });
      }
    }

    // 7. Validate minRating
    let canonicalMinRating: string | null = null;
    if (input.minRating !== undefined && input.minRating !== null) {
      const ratingStr = validateStrictDecimal(input.minRating, 'minRating');
      if (ratingStr.toLowerCase().includes('e')) {
        throw new NearbyValidationError('Scientific notation is not allowed for minRating', {
          minRating: 'Format is invalid',
        });
      }
      const ratingNum = Number(ratingStr);
      if (ratingNum < 0 || ratingNum > 5) {
        throw new NearbyValidationError('minRating must be between 0 and 5', {
          minRating: 'Value out of range',
        });
      }
      canonicalMinRating = String(ratingNum);
    }

    // 8. Validate references in database in a single roundtrip
    const categoryType = resolvedCategoryId
      ? mappedTypes.includes('BUSINESS')
        ? 'business'
        : 'attraction'
      : undefined;

    const references = await this.repository.validateReferences({
      regionId: resolvedRegionId ?? undefined,
      categoryId: resolvedCategoryId ?? undefined,
      categoryType,
    });

    const invalidParams: Record<string, string> = {};
    if (references.region === 'missing') {
      invalidParams.regionId = 'Region does not exist';
    } else if (references.region === 'deleted') {
      invalidParams.regionId = 'Region is not publicly available';
    }

    if (references.category === 'missing') {
      invalidParams.categoryId = 'Category does not exist';
    }

    if (references.businessType === 'missing') {
      invalidParams.categoryId = 'Business Type does not exist';
    } else if (references.businessType === 'inactive') {
      invalidParams.categoryId = 'Business Type is inactive';
    }

    if (Object.keys(invalidParams).length > 0) {
      throw new NearbyValidationError('Invalid search parameters', invalidParams);
    }

    // 9. Construct Canonical Query Context & Fingerprint
    const canonicalQuery: CanonicalNearbyQuery = {
      lat: latCanonical,
      lng: lngCanonical,
      radius: resolvedRadius,
      types: mappedTypes,
      regionId: resolvedRegionId,
      categoryId: resolvedCategoryId,
      minRating: canonicalMinRating,
      limit: resolvedLimit,
      sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC',
    };

    const fingerprint = buildNearbyQueryFingerprint(canonicalQuery);

    // 10. Decode and verify cursor if present
    let afterKeyset: NearbySearchCriteriaBoundary | undefined;
    if (input.cursor !== undefined && input.cursor !== null) {
      const decodedPayload = this.cursorCodec.decode(input.cursor, fingerprint);
      afterKeyset = {
        rawDistanceMeters: decodedPayload.distance,
        entityType: decodedPayload.entityType,
        entityTypeRank: RANK_MAPPING[decodedPayload.entityType],
        entityId: decodedPayload.id,
      };
    }

    // 11. Call Repository
    const page = await this.repository.searchNearby({
      latitude: latCanonical,
      longitude: lngCanonical,
      radiusMeters: resolvedRadius,
      entityTypes: mappedTypes,
      regionId: resolvedRegionId ?? undefined,
      categoryId: resolvedCategoryId ?? undefined,
      minRating: canonicalMinRating ?? undefined,
      limit: resolvedLimit,
      after: afterKeyset,
    });

    // 11. Trimming and Next Cursor Construction
    const hasNextPage = page.items.length > resolvedLimit;
    const trimmedItems = page.items.slice(0, resolvedLimit);

    let nextCursor: string | null = null;
    if (hasNextPage && trimmedItems.length > 0) {
      const lastItem = trimmedItems[trimmedItems.length - 1];
      if (lastItem) {
        const payload: NearbyCursorPayload = {
          distance: lastItem.rawDistanceMeters,
          entityType: lastItem.entityType,
          id: lastItem.entityId,
        };
        nextCursor = this.cursorCodec.encode(payload, fingerprint);
      }
    }

    // 12. Map Projection to DTO Search Items
    const items = trimmedItems.map((item) => this.mapProjectionToDto(item));

    return {
      items,
      pagination: {
        nextCursor,
        hasNextPage,
      },
      meta: {
        origin: {
          latitude: Number(latCanonical),
          longitude: Number(lngCanonical),
        },
        radiusMeters: resolvedRadius,
      },
    };
  }

  private mapProjectionToDto(item: NearbyResultProjection): NearbySearchItem {
    const rawDistance = Number(item.rawDistanceMeters);
    const distanceMeters = Number.isFinite(rawDistance) ? Number(rawDistance.toFixed(2)) : 0;

    const ratingAvg = item.averageRating !== null ? Number(item.averageRating) : null;
    const ratingAverage =
      ratingAvg !== null && Number.isFinite(ratingAvg) ? Number(ratingAvg.toFixed(2)) : null;

    const region = item.regionId
      ? {
          id: item.regionId,
          name: item.regionName ?? '',
          slug: item.regionSlug ?? '',
        }
      : null;

    return {
      entityType: item.entityType,
      id: item.entityId,
      name: item.name,
      slug: item.slug,
      latitude: item.latitude,
      longitude: item.longitude,
      distanceMeters,
      region,
      thumbnailUrl: toPublicThumbnailUrl(item.thumbnailUrl),
      rating: {
        average: ratingAverage,
        count: item.reviewCount,
      },
    };
  }
}

interface NearbySearchCriteriaBoundary {
  rawDistanceMeters: string;
  entityType: NearbyEntityType;
  entityTypeRank: number;
  entityId: string;
}
