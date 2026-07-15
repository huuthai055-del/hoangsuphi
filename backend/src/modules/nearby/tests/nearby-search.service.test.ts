import { describe, expect, mock, test } from 'bun:test';
import {
  NearbyCursorQueryMismatchError,
  NearbyValidationError,
} from '../application/nearby-application.errors';
import { NearbyCursorCodec, type NearbyCursorKeyring } from '../application/nearby-cursor.codec';
import {
  type CanonicalNearbyQuery,
  buildNearbyQueryFingerprint,
} from '../application/nearby-query-fingerprint';
import { NearbySearchService } from '../application/nearby-search.service';
import type { NearbyResultProjection } from '../repository/nearby-projection';
import type { INearbyRepository } from '../repository/nearby-repository.interface';

const mockKeyring: NearbyCursorKeyring = {
  activeKeyId: 'k1',
  keys: {
    k1: '12345678901234567890123456789012',
  },
};

const defaultInput = {
  latitude: 22.7844,
  longitude: 104.6644,
};

function createMockRepository(
  mockSearchNearby: any,
  mockValidateReferences?: any
): INearbyRepository {
  return {
    searchNearby: mockSearchNearby,
    validateReferences:
      mockValidateReferences ||
      mock(async () => ({
        region: 'valid',
        category: 'valid',
        businessType: 'valid',
      })),
  };
}

describe('NearbySearchService Validation', () => {
  const codec = new NearbyCursorCodec(mockKeyring);

  test('requires latitude and longitude', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ ...defaultInput, latitude: undefined as any })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, longitude: undefined as any })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('rejects out of bound coordinates', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ latitude: 90.000001, longitude: 100 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: -90.000001, longitude: 100 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: 20, longitude: 180.000001 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: 20, longitude: -180.000001 })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('rejects coordinates with scientific notation', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ latitude: '2.2e1', longitude: 100 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: 20, longitude: '1.4E2' })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('rejects coordinate precision exceeding 6 decimal places', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ latitude: 22.7844001, longitude: 104.6644 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: 22.7844, longitude: 104.6644002 })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('correctly normalizes coordinate decimal places and negative zero', async () => {
    let capturedCriteria: any;
    const repo = createMockRepository(
      mock(async (criteria: any) => {
        capturedCriteria = criteria;
        return { items: [] };
      })
    );
    const service = new NearbySearchService(repo, codec);

    await service.search({ latitude: 22.7, longitude: -0 });
    expect(capturedCriteria.latitude).toBe('22.700000');
    expect(capturedCriteria.longitude).toBe('0.000000');
  });

  test('validates radius limits and formats', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    // valid
    await service.search({ ...defaultInput, radiusMeters: 100 });
    await service.search({ ...defaultInput, radiusMeters: 50000 });

    // invalid float
    expect(service.search({ ...defaultInput, radiusMeters: 500.5 })).rejects.toThrow(
      NearbyValidationError
    );
    // invalid out of bounds
    expect(service.search({ ...defaultInput, radiusMeters: 99 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, radiusMeters: 50001 })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('validates limit policy', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    // valid boundaries
    await service.search({ ...defaultInput, limit: 1 });
    await service.search({ ...defaultInput, limit: 50 });

    // invalid float
    expect(service.search({ ...defaultInput, limit: 10.5 })).rejects.toThrow(NearbyValidationError);
    // invalid out of bounds
    expect(service.search({ ...defaultInput, limit: 0 })).rejects.toThrow(NearbyValidationError);
    expect(service.search({ ...defaultInput, limit: 51 })).rejects.toThrow(NearbyValidationError);
  });

  test('normalizes entity types and rejects invalid list conditions', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    // empty types list
    expect(service.search({ ...defaultInput, entityTypes: [] })).rejects.toThrow(
      NearbyValidationError
    );
    // unknown type
    expect(service.search({ ...defaultInput, entityTypes: ['unknown'] })).rejects.toThrow(
      NearbyValidationError
    );
    // duplicate types
    expect(service.search({ ...defaultInput, entityTypes: ['place', 'place'] })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('sorts entity types by rank rank', async () => {
    let capturedCriteria: any;
    const repo = createMockRepository(
      mock(async (criteria: any) => {
        capturedCriteria = criteria;
        return { items: [] };
      })
    );
    const service = new NearbySearchService(repo, codec);

    await service.search({
      ...defaultInput,
      entityTypes: ['utility', 'business', 'place', 'attraction'],
    });
    expect(capturedCriteria.entityTypes).toEqual([
      'TOURIST_PLACE',
      'ATTRACTION',
      'BUSINESS',
      'UTILITY',
    ]);
  });

  test('validates UUID filter format', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ ...defaultInput, regionId: 'not-a-uuid' })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, categoryId: 'not-a-uuid' })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('enforces category cross-field validation rules', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    const categoryId = 'e2000000-0000-4000-8000-000000000001';

    // categoryId + missing entityTypes
    expect(service.search({ ...defaultInput, categoryId })).rejects.toThrow(NearbyValidationError);
    // categoryId + tourist place type
    expect(service.search({ ...defaultInput, categoryId, entityTypes: ['place'] })).rejects.toThrow(
      NearbyValidationError
    );
    // categoryId + multiple types
    expect(
      service.search({ ...defaultInput, categoryId, entityTypes: ['attraction', 'utility'] })
    ).rejects.toThrow(NearbyValidationError);

    // valid category filter queries
    await service.search({ ...defaultInput, categoryId, entityTypes: ['attraction'] });
    await service.search({ ...defaultInput, categoryId, entityTypes: ['business'] });
    await service.search({ ...defaultInput, categoryId, entityTypes: ['utility'] });
  });

  test('validates minRating constraints', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ ...defaultInput, minRating: -0.1 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, minRating: 5.1 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, minRating: '4.5e0' })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, minRating: '' })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ ...defaultInput, minRating: '   ' })).rejects.toThrow(
      NearbyValidationError
    );

    // holds distinct behavior between minRating=0 and minRating=null
    let criteriaCaptured: any;
    const trackingRepo = createMockRepository(
      mock(async (criteria: any) => {
        criteriaCaptured = criteria;
        return { items: [] };
      })
    );
    const trackingService = new NearbySearchService(trackingRepo, codec);

    await trackingService.search({ ...defaultInput, minRating: 0 });
    expect(criteriaCaptured.minRating).toBe('0');

    await trackingService.search({ ...defaultInput, minRating: '4.44' });
    expect(criteriaCaptured.minRating).toBe('4.44');

    await trackingService.search({ ...defaultInput, minRating: undefined });
    expect(criteriaCaptured.minRating).toBeUndefined();
  });

  test('rejects coordinates with invalid formats like hex, binary, and empty/whitespace', async () => {
    const repo = createMockRepository(mock(async () => ({ items: [] })));
    const service = new NearbySearchService(repo, codec);

    expect(service.search({ latitude: '0x10', longitude: 104 })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: 22, longitude: '0b10' })).rejects.toThrow(
      NearbyValidationError
    );
    expect(service.search({ latitude: '', longitude: 104 })).rejects.toThrow(NearbyValidationError);
    expect(service.search({ latitude: 22, longitude: '   ' })).rejects.toThrow(
      NearbyValidationError
    );
  });

  test('validates database references and throws NearbyValidationError on failure', async () => {
    // 1. Missing Region
    const repoRegionMissing = createMockRepository(
      mock(async () => ({ items: [] })),
      mock(async () => ({
        region: 'missing',
        category: 'not_requested',
        businessType: 'not_requested',
      }))
    );
    const serviceRegionMissing = new NearbySearchService(repoRegionMissing, codec);
    expect(
      serviceRegionMissing.search({
        ...defaultInput,
        regionId: 'e2000000-0000-4000-8000-000000000001',
      })
    ).rejects.toThrow(NearbyValidationError);

    // 2. Deleted Region
    const repoRegionDeleted = createMockRepository(
      mock(async () => ({ items: [] })),
      mock(async () => ({
        region: 'deleted',
        category: 'not_requested',
        businessType: 'not_requested',
      }))
    );
    const serviceRegionDeleted = new NearbySearchService(repoRegionDeleted, codec);
    expect(
      serviceRegionDeleted.search({
        ...defaultInput,
        regionId: 'e2000000-0000-4000-8000-000000000001',
      })
    ).rejects.toThrow(NearbyValidationError);

    // 3. Missing Category (Attraction/Utility)
    const repoCategoryMissing = createMockRepository(
      mock(async () => ({ items: [] })),
      mock(async () => ({
        region: 'valid',
        category: 'missing',
        businessType: 'not_requested',
      }))
    );
    const serviceCategoryMissing = new NearbySearchService(repoCategoryMissing, codec);
    expect(
      serviceCategoryMissing.search({
        ...defaultInput,
        entityTypes: ['attraction'],
        categoryId: 'e2000000-0000-4000-8000-000000000001',
      })
    ).rejects.toThrow(NearbyValidationError);

    // 4. Missing Business Type
    const repoBusiTypeMissing = createMockRepository(
      mock(async () => ({ items: [] })),
      mock(async () => ({
        region: 'valid',
        category: 'not_requested',
        businessType: 'missing',
      }))
    );
    const serviceBusiTypeMissing = new NearbySearchService(repoBusiTypeMissing, codec);
    expect(
      serviceBusiTypeMissing.search({
        ...defaultInput,
        entityTypes: ['business'],
        categoryId: 'e2000000-0000-4000-8000-000000000001',
      })
    ).rejects.toThrow(NearbyValidationError);

    // 5. Inactive Business Type
    const repoBusiTypeInactive = createMockRepository(
      mock(async () => ({ items: [] })),
      mock(async () => ({
        region: 'valid',
        category: 'not_requested',
        businessType: 'inactive',
      }))
    );
    const serviceBusiTypeInactive = new NearbySearchService(repoBusiTypeInactive, codec);
    expect(
      serviceBusiTypeInactive.search({
        ...defaultInput,
        entityTypes: ['business'],
        categoryId: 'e2000000-0000-4000-8000-000000000001',
      })
    ).rejects.toThrow(NearbyValidationError);
  });
});

describe('NearbySearchService Fingerprinting', () => {
  test('generates matching fingerprints for equivalent context requests', () => {
    const q1: CanonicalNearbyQuery = {
      lat: '22.700000',
      lng: '104.680000',
      radius: 5000,
      types: ['TOURIST_PLACE', 'BUSINESS'],
      regionId: null,
      categoryId: null,
      minRating: null,
      limit: 20,
      sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC',
    };

    const q2: CanonicalNearbyQuery = { ...q1 };
    expect(buildNearbyQueryFingerprint(q1)).toBe(buildNearbyQueryFingerprint(q2));
  });

  test('generates different fingerprints for differing context requests', () => {
    const base: CanonicalNearbyQuery = {
      lat: '22.700000',
      lng: '104.680000',
      radius: 5000,
      types: ['TOURIST_PLACE', 'BUSINESS'],
      regionId: null,
      categoryId: null,
      minRating: null,
      limit: 20,
      sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC',
    };

    const diffLat = { ...base, lat: '22.700001' };
    const diffMinRating = { ...base, minRating: '0.0' };
    const diffLimit = { ...base, limit: 21 };

    expect(buildNearbyQueryFingerprint(base)).not.toBe(buildNearbyQueryFingerprint(diffLat));
    expect(buildNearbyQueryFingerprint(base)).not.toBe(buildNearbyQueryFingerprint(diffMinRating));
    expect(buildNearbyQueryFingerprint(base)).not.toBe(buildNearbyQueryFingerprint(diffLimit));
  });
});

describe('NearbySearchService Keyset Pagination & Orchestration', () => {
  const codec = new NearbyCursorCodec(mockKeyring);

  test('returns hasNextPage=false and nextCursor=null when repository returns <= limit items', async () => {
    const limit = 3;
    const items: NearbyResultProjection[] = [
      {
        entityType: 'TOURIST_PLACE',
        entityTypeRank: 1,
        entityId: 'e2000000-0000-4000-8000-000000000001',
        name: 'Place 1',
        slug: 'place-1',
        latitude: 22.7,
        longitude: 104.6,
        rawDistanceMeters: '100.123456',
        displayDistanceMeters: 100.123456,
        regionId: null,
        regionName: null,
        regionSlug: null,
        thumbnailUrl: null,
        averageRating: null,
        reviewCount: 0,
      },
      {
        entityType: 'ATTRACTION',
        entityTypeRank: 2,
        entityId: 'e2000000-0000-4000-8000-000000000002',
        name: 'Attraction 1',
        slug: 'attraction-1',
        latitude: 22.71,
        longitude: 104.61,
        rawDistanceMeters: '200.56789',
        displayDistanceMeters: 200.56789,
        regionId: null,
        regionName: null,
        regionSlug: null,
        thumbnailUrl: null,
        averageRating: '4.5',
        reviewCount: 2,
      },
    ];

    const repo = createMockRepository(mock(async () => ({ items })));
    const service = new NearbySearchService(repo, codec);

    const result = await service.search({ ...defaultInput, limit });
    expect(result.items.length).toBe(2);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  test('returns hasNextPage=true and nextCursor from limit-th item when repository returns limit+1 items', async () => {
    const limit = 2;
    const items: NearbyResultProjection[] = [
      {
        entityType: 'TOURIST_PLACE',
        entityTypeRank: 1,
        entityId: 'e2000000-0000-4000-8000-000000000001',
        name: 'Place 1',
        slug: 'place-1',
        latitude: 22.7001,
        longitude: 104.6001,
        rawDistanceMeters: '100.123456',
        displayDistanceMeters: 100.123456,
        regionId: null,
        regionName: null,
        regionSlug: null,
        thumbnailUrl: null,
        averageRating: null,
        reviewCount: 0,
      },
      {
        entityType: 'ATTRACTION',
        entityTypeRank: 2,
        entityId: 'e2000000-0000-4000-8000-000000000002',
        name: 'Attraction 1',
        slug: 'attraction-1',
        latitude: 22.7002,
        longitude: 104.6002,
        rawDistanceMeters: '200.56789',
        displayDistanceMeters: 200.56789,
        regionId: null,
        regionName: null,
        regionSlug: null,
        thumbnailUrl: null,
        averageRating: '4.5',
        reviewCount: 2,
      },
      {
        entityType: 'BUSINESS',
        entityTypeRank: 3,
        entityId: 'e2000000-0000-4000-8000-000000000003',
        name: 'Business 1',
        slug: 'business-1',
        latitude: 22.7003,
        longitude: 104.6003,
        rawDistanceMeters: '300.99999',
        displayDistanceMeters: 300.99999,
        regionId: null,
        regionName: null,
        regionSlug: null,
        thumbnailUrl: null,
        averageRating: null,
        reviewCount: 0,
      },
    ];

    const repo = createMockRepository(mock(async () => ({ items })));
    const service = new NearbySearchService(repo, codec);

    const result = await service.search({ ...defaultInput, limit });
    expect(result.items.length).toBe(limit);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.nextCursor).not.toBeNull();

    // Verify nextCursor is generated from the last of the mapped items (the 2nd item), not the 3rd item!
    const query = {
      lat: (22.7844).toFixed(6),
      lng: (104.6644).toFixed(6),
      radius: 5000,
      types: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
      regionId: null,
      categoryId: null,
      minRating: null,
      limit,
      sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC',
    } as const;
    const nextCursor = result.pagination.nextCursor;
    if (!nextCursor) {
      throw new Error('nextCursor is missing');
    }
    const fingerprint = buildNearbyQueryFingerprint(query);
    const decodedCursor = codec.decode(nextCursor, fingerprint);
    expect(decodedCursor.id).toBe(items[1]?.entityId ?? ''); // 2nd item
    expect(decodedCursor.distance).toBe('200.56789'); // keep raw distance decimal precision
  });

  test('rejects mismatched cursor fingerprint and does not invoke repository', async () => {
    const repoSearchMock = mock(async () => ({ items: [] }));
    const repo = createMockRepository(repoSearchMock);
    const service = new NearbySearchService(repo, codec);

    // Create cursor with different fingerprint
    const otherFp = 'b'.repeat(64);
    const cursorPayload = {
      distance: '100.123',
      entityType: 'TOURIST_PLACE' as const,
      id: 'e2000000-0000-4000-8000-000000000001',
    };
    const invalidToken = codec.encode(cursorPayload, otherFp);

    expect(service.search({ ...defaultInput, cursor: invalidToken })).rejects.toThrow(
      NearbyCursorQueryMismatchError
    );
    expect(repoSearchMock).toHaveBeenCalledTimes(0);
  });

  test('propagates repository errors unmodified', async () => {
    const repo = createMockRepository(
      mock(async () => {
        throw new Error('Database connection reset');
      })
    );
    const service = new NearbySearchService(repo, codec);

    expect(service.search(defaultInput)).rejects.toThrow('Database connection reset');
  });
});
