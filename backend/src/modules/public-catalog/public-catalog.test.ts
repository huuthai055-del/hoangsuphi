import { describe, expect, test } from 'bun:test';
import { errorHandlerMiddleware } from '@/middleware/error';
import type { IMediaStorage } from '@/modules/media/domain/storage.interface';
import { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import { Hono } from 'hono';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogCursorCodec } from './public-catalog.cursor';
import { parsePublicCatalogListQuery } from './public-catalog.dto';
import { createPublicCatalogRouter } from './public-catalog.route';
import { PublicCatalogService } from './public-catalog.service';
import type {
  IPublicCatalogRepository,
  PublicCatalogDetailProjection,
  PublicCatalogItemProjection,
  PublicCatalogPageCriteria,
  PublicCatalogReferenceProjection,
  PublicReferenceKind,
} from './public-catalog.types';

const IDS = {
  businessOne: '98000000-0000-4000-8000-000000000001',
  businessTwo: '98000000-0000-4000-8000-000000000002',
  region: '98100000-0000-4000-8000-000000000001',
  taxonomy: '98200000-0000-4000-8000-000000000001',
  amenity: '98300000-0000-4000-8000-000000000001',
  media: '98400000-0000-4000-8000-000000000001',
} as const;

const storage: IMediaStorage = {
  upload: async () => undefined,
  download: async () => Buffer.alloc(0),
  delete: async () => undefined,
  exists: async () => true,
  getUrl: async (key) => `/uploads/${key}`,
};

const cursorCodec = new PublicCatalogCursorCodec({
  activeKeyId: 'test-v1',
  keys: { 'test-v1': 'public-catalog-test-secret-with-at-least-32-bytes' },
});

const reference: PublicCatalogReferenceProjection = {
  id: IDS.taxonomy,
  name: 'Lưu trú',
  slug: 'luu-tru',
  icon: 'bed',
  category: null,
  color: '#123456',
  parentId: null,
  level: null,
  isUtility: null,
};

function item(
  id: string,
  name: string,
  updatedAt: Date = new Date('2026-07-20T05:00:00.000Z')
): PublicCatalogItemProjection {
  return {
    entityType: 'business',
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    summarySource: '<p>Nhà nghỉ &amp; trải nghiệm địa phương.</p>',
    updatedAt,
    nameKey: name.toLowerCase(),
    region: { id: IDS.region, name: 'Bản Phùng', slug: 'ban-phung' },
    taxonomy: reference,
    image: {
      id: IDS.media,
      storageProvider: 'LOCAL',
      storageKey: 'catalog/cover.webp',
      width: 1200,
      height: 800,
      altText: 'Ảnh cơ sở',
    },
    coverUrlCandidate: 'javascript:alert(1)',
    rating: { average: '4.75', count: 8 },
    priceMin: '100000',
    priceMax: '250000',
  };
}

function detailProjection(
  contact: PublicCatalogDetailProjection['contact'] = {
    phoneE164: '+84901234567',
    zaloUrl: 'https://zalo.me/hoangsuphi',
    websiteUrl: 'https://example.com/stay',
  }
): PublicCatalogDetailProjection {
  const base = item(IDS.businessOne, 'Nha Nghi Dao');
  return {
    ...base,
    descriptionSource: '<p>Mô tả đầy đủ.</p>',
    contentSource: null,
    location: { latitude: 22.75, longitude: 104.98 },
    media: [base.image as NonNullable<PublicCatalogItemProjection['image']>],
    amenities: [{ ...reference, id: IDS.amenity, name: 'Wi-Fi', slug: 'wifi' }],
    contact,
    related: [
      {
        entityType: 'business',
        id: IDS.businessTwo,
        name: 'Nha Nghi Mong',
        slug: 'nha-nghi-mong',
      },
    ],
  };
}

class RepositoryStub implements IPublicCatalogRepository {
  page: PublicCatalogItemProjection[] = [
    item(IDS.businessOne, 'Nha Nghi Dao'),
    item(IDS.businessTwo, 'Nha Nghi Mong', new Date('2026-07-19T05:00:00.000Z')),
  ];
  detail: PublicCatalogDetailProjection | null = detailProjection();
  references: PublicCatalogReferenceProjection[] = [reference];
  pageCriteria: PublicCatalogPageCriteria[] = [];
  referenceKinds: PublicReferenceKind[] = [];

  async findPage(criteria: PublicCatalogPageCriteria): Promise<PublicCatalogItemProjection[]> {
    this.pageCriteria.push(criteria);
    return this.page;
  }

  async findDetail(): Promise<PublicCatalogDetailProjection | null> {
    return this.detail;
  }

  async listReferences(kind: PublicReferenceKind): Promise<PublicCatalogReferenceProjection[]> {
    this.referenceKinds.push(kind);
    return this.references;
  }
}

function createHarness(repository = new RepositoryStub()): {
  app: Hono;
  repository: RepositoryStub;
  service: PublicCatalogService;
} {
  const service = new PublicCatalogService(
    repository,
    cursorCodec,
    new MediaStorageResolver(storage, storage),
    'http://localhost:3000'
  );
  const controller = new PublicCatalogController(service);
  const app = new Hono();
  app.route(
    '/api/v1/public',
    createPublicCatalogRouter(() => controller)
  );
  app.onError(errorHandlerMiddleware());
  return { app, repository, service };
}

describe('Public catalog query and cursor contract', () => {
  test('normalizes defaults, slug filters, and deterministic amenity order', () => {
    expect(parsePublicCatalogListQuery('regions', new URLSearchParams())).toMatchObject({
      kind: 'regions',
      limit: 20,
      sort: 'name',
    });
    expect(
      parsePublicCatalogListQuery(
        'businesses',
        new URLSearchParams(
          'limit=50&sort=name&regionSlug=ban-phung&businessTypeSlug=luu-tru&amenitySlugs=wifi,bua-sang'
        )
      )
    ).toMatchObject({
      amenitySlugs: ['bua-sang', 'wifi'],
      regionSlug: 'ban-phung',
      businessTypeSlug: 'luu-tru',
    });
  });

  test('rejects unknown, repeated, malformed, or entity-incompatible parameters', () => {
    for (const [kind, query] of [
      ['businesses', 'page=1'],
      ['businesses', 'limit=1&limit=2'],
      ['businesses', 'limit=0'],
      ['businesses', 'amenitySlugs=wifi,wifi'],
      ['articles', 'regionSlug=ban-phung'],
      ['regions', 'categorySlug=cam-nang'],
    ] as const) {
      expect(() => parsePublicCatalogListQuery(kind, new URLSearchParams(query))).toThrow();
    }
  });

  test('roundtrips signed keysets and rejects tamper or filter replay', () => {
    const query = parsePublicCatalogListQuery(
      'businesses',
      new URLSearchParams('limit=20&regionSlug=ban-phung')
    );
    const fingerprint = cursorCodec.fingerprint(query);
    const keyset = {
      sort: 'newest' as const,
      sortTimestamp: new Date('2026-07-20T05:00:00.000Z'),
      nameKey: 'nha nghi dao',
      id: IDS.businessOne,
    };
    const cursor = cursorCodec.encode(keyset, fingerprint);
    expect(cursorCodec.decode(cursor, fingerprint, 'newest')).toEqual(keyset);

    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith('A') ? 'B' : 'A'}`;
    const replayQuery = { ...query, regionSlug: 'thong-nguyen' };
    expect(() => cursorCodec.decode(tampered, fingerprint, 'newest')).toThrow();
    expect(() =>
      cursorCodec.decode(cursor, cursorCodec.fingerprint(replayQuery), 'newest')
    ).toThrow();
  });
});

describe('Public catalog HTTP and DTO contract', () => {
  test('returns a whitelisted card, no-store header, and signed next cursor', async () => {
    const { app, repository } = createHarness();
    const response = await app.request('/api/v1/public/catalog/businesses?limit=1');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({
      data: [
        {
          kind: 'business',
          id: IDS.businessOne,
          canonicalPath: '/co-so/nha-nghi-dao',
          summary: 'Nhà nghỉ & trải nghiệm địa phương.',
          image: { url: 'http://localhost:3000/uploads/catalog/cover.webp' },
          rating: { average: 4.75, count: 8 },
          price: { min: '100000', max: '250000', currency: 'VND' },
        },
      ],
      meta: { cursor: null, hasMore: true, totalReturned: 1 },
      error: null,
    });
    expect(body.meta.nextCursor).toBeString();
    expect(repository.pageCriteria[0]?.after).toBeNull();
    const serialized = JSON.stringify(body);
    for (const forbidden of [
      'entityType',
      'nameKey',
      'storageKey',
      'storageProvider',
      'publicationStatus',
      'verifiedAt',
      'consentConfirmedAt',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test('returns detail contact fields independently without inferring Zalo', async () => {
    const repository = new RepositoryStub();
    repository.detail = detailProjection({
      phoneE164: '+84901234567',
      zaloUrl: 'https://evil.example/zalo',
      websiteUrl: 'http://example.com',
    });
    const { app } = createHarness(repository);
    const response = await app.request('/api/v1/public/catalog/businesses/nha-nghi-dao');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        contact: {
          phoneTel: '+84901234567',
          phoneDisplay: '+84901234567',
          zaloUrl: null,
          websiteUrl: null,
        },
        related: [
          {
            kind: 'business',
            id: IDS.businessTwo,
            canonicalPath: '/co-so/nha-nghi-mong',
          },
        ],
      },
      error: null,
    });
  });

  test('exposes only known public references and hides unavailable details as 404', async () => {
    const repository = new RepositoryStub();
    const harness = createHarness(repository);
    const referenceResponse = await harness.app.request('/api/v1/public/references/business-types');
    expect(referenceResponse.status).toBe(200);
    expect(await referenceResponse.json()).toMatchObject({
      data: [{ slug: 'luu-tru' }],
      meta: { totalReturned: 1 },
      error: null,
    });
    expect(repository.referenceKinds).toEqual(['business-types']);

    repository.detail = null;
    const missing = await harness.app.request('/api/v1/public/catalog/businesses/khong-ton-tai');
    expect(missing.status).toBe(404);
    expect((await missing.json()).detail).toBe(
      'Public catalog resource was not found or is unavailable'
    );
  });

  test('rejects unknown kinds, invalid slugs, and unsupported filters at the HTTP boundary', async () => {
    const { app } = createHarness();
    for (const path of [
      '/api/v1/public/catalog/users',
      '/api/v1/public/catalog/businesses/INVALID_SLUG',
      '/api/v1/public/catalog/articles?regionSlug=ban-phung',
      '/api/v1/public/references/private-statuses',
    ]) {
      const response = await app.request(path);
      expect([400, 404]).toContain(response.status);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });
});
