import { describe, expect, test } from 'bun:test';
import {
  RecommendationProjectionInvariantError,
  RecommendationSourceNotFoundError,
  RecommendationsService,
} from './recommendations.service';
import { parseRecommendationsQuery } from '../dto/recommendations.dto';
import type { RecommendationReadProjection } from '../repository/recommendation-projection';
import type {
  IRecommendationsRepository,
  RecommendationQueryCriteria,
} from '../repository/recommendations-repository.interface';

const sourceId = '018f0a0e-a5a4-7f1a-b33a-123456789abc';

function makeItem(
  overrides: Partial<RecommendationReadProjection> = {}
): RecommendationReadProjection {
  return {
    entityType: 'PLACE',
    id: '018f0a0e-a5a4-7f1a-b33a-123456789abd',
    name: 'Bản Phùng',
    slug: 'ban-phung',
    thumbnailUrl: 'https://images.example.test/ban-phung.webp',
    regionId: '018f0a0e-a5a4-7f1a-b33a-123456789abe',
    regionName: 'Hoàng Su Phì',
    regionSlug: 'hoang-su-phi',
    ratingAverage: 4.5,
    ratingCount: 2,
    distanceMeters: 123.45,
    ...overrides,
  };
}

class FakeRecommendationsRepository implements IRecommendationsRepository {
  public readonly calls: string[] = [];
  public sourceExists = true;
  public items: RecommendationReadProjection[] = [];

  public async resolvePublicSource(sourceType: 'place' | 'business' | 'attraction', id: string) {
    this.calls.push(`source:${sourceType}:${id}`);
    return this.sourceExists
      ? {
          sourceType,
          id,
          regionId: '018f0a0e-a5a4-7f1a-b33a-123456789abe',
          location: { x: 104.7, y: 22.6 },
        }
      : null;
  }

  public async findNearby(_criteria: RecommendationQueryCriteria) {
    this.calls.push('nearby');
    return this.items;
  }

  public async findSameRegion(_criteria: RecommendationQueryCriteria) {
    this.calls.push('same_region');
    return this.items;
  }

  public async findTopRated(_criteria: RecommendationQueryCriteria) {
    this.calls.push('top_rated');
    return this.items;
  }

  public async findNewest(_criteria: RecommendationQueryCriteria) {
    this.calls.push('newest');
    return this.items;
  }
}

describe('RecommendationsService', () => {
  test('uses exactly a public source lookup plus one nearby query and maps public fields', async () => {
    const repository = new FakeRecommendationsRepository();
    repository.items = [makeItem()];
    const service = new RecommendationsService(repository);

    const result = await service.getRecommendations(
      parseRecommendationsQuery({ strategy: 'nearby', sourceType: 'place', sourceId })
    );

    expect(repository.calls).toEqual([`source:place:${sourceId}`, 'nearby']);
    expect(result).toEqual({
      data: [
        {
          entityType: 'PLACE',
          id: '018f0a0e-a5a4-7f1a-b33a-123456789abd',
          name: 'Bản Phùng',
          slug: 'ban-phung',
          url: '/dia-diem/ban-phung',
          thumbnailUrl: 'https://images.example.test/ban-phung.webp',
          region: {
            id: '018f0a0e-a5a4-7f1a-b33a-123456789abe',
            name: 'Hoàng Su Phì',
            slug: 'hoang-su-phi',
          },
          rating: { average: 4.5, count: 2 },
          distanceMeters: 123.45,
        },
      ],
      meta: {
        strategy: 'nearby',
        limit: 6,
        source: { type: 'place', id: sourceId },
      },
      error: null,
    });
  });

  test('does not perform source lookup for global strategies and fail-closes unsafe thumbnails', async () => {
    const repository = new FakeRecommendationsRepository();
    repository.items = [makeItem({ entityType: 'ARTICLE', slug: 'cam-nang', thumbnailUrl: 'http://x.test' })];
    const service = new RecommendationsService(repository);

    const result = await service.getRecommendations(
      parseRecommendationsQuery({ strategy: 'top_rated' })
    );

    expect(repository.calls).toEqual(['top_rated']);
    expect(result.data[0]?.url).toBe('/cam-nang/cam-nang');
    expect(result.data[0]?.thumbnailUrl).toBeNull();
    expect(result.meta.source).toBeNull();
  });

  test('uses one query for newest and exactly two queries for same-region recommendations', async () => {
    const repository = new FakeRecommendationsRepository();
    const service = new RecommendationsService(repository);

    await service.getRecommendations(parseRecommendationsQuery({ strategy: 'newest' }));
    expect(repository.calls).toEqual(['newest']);

    repository.calls.length = 0;
    await service.getRecommendations(
      parseRecommendationsQuery({ strategy: 'same_region', sourceType: 'attraction', sourceId })
    );
    expect(repository.calls).toEqual([`source:attraction:${sourceId}`, 'same_region']);
  });

  test('returns a single generic not-found error when the source is unavailable', async () => {
    const repository = new FakeRecommendationsRepository();
    repository.sourceExists = false;
    const service = new RecommendationsService(repository);

    await expect(
      service.getRecommendations(
        parseRecommendationsQuery({ strategy: 'same_region', sourceType: 'business', sourceId })
      )
    ).rejects.toBeInstanceOf(RecommendationSourceNotFoundError);
    expect(repository.calls).toEqual([`source:business:${sourceId}`]);
  });

  test('fails closed when a repository projection has an incomplete region', async () => {
    const repository = new FakeRecommendationsRepository();
    repository.items = [makeItem({ regionName: null })];
    const service = new RecommendationsService(repository);

    await expect(
      service.getRecommendations(parseRecommendationsQuery({ strategy: 'newest' }))
    ).rejects.toBeInstanceOf(RecommendationProjectionInvariantError);
  });
});
