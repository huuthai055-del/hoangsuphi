import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import type { IMediaStorage } from '@/modules/media/domain/storage.interface';
import { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PublicCatalogCursorCodec } from './public-catalog.cursor';
import { DrizzlePublicCatalogRepository } from './public-catalog.repository';
import { PublicCatalogService } from './public-catalog.service';
import type { PublicCatalogListQuery } from './public-catalog.types';

const testDatabaseUrl =
  process.env.PUBLIC_CATALOG_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const ids = {
  user: '99000000-0000-4000-8000-000000000001',
  activeRegion: '99100000-0000-4000-8000-000000000001',
  deletedRegion: '99100000-0000-4000-8000-000000000002',
  scaleRegion: '99100000-0000-4000-8000-000000000003',
  activeType: '99200000-0000-4000-8000-000000000001',
  inactiveType: '99200000-0000-4000-8000-000000000002',
  publicAmenity: '99300000-0000-4000-8000-000000000001',
  privateAmenity: '99300000-0000-4000-8000-000000000002',
  publicAttractionCategory: '99400000-0000-4000-8000-000000000001',
  privateAttractionCategory: '99400000-0000-4000-8000-000000000002',
  publicArticleCategory: '99400000-0000-4000-8000-000000000003',
  privateArticleCategory: '99400000-0000-4000-8000-000000000004',
  businessOne: '99500000-0000-4000-8000-000000000001',
  businessTwo: '99500000-0000-4000-8000-000000000002',
  inactiveBusiness: '99500000-0000-4000-8000-000000000003',
  deletedBusiness: '99500000-0000-4000-8000-000000000004',
  inactiveTypeBusiness: '99500000-0000-4000-8000-000000000005',
  deletedRegionBusiness: '99500000-0000-4000-8000-000000000006',
  publicAttraction: '99600000-0000-4000-8000-000000000001',
  privateAttraction: '99600000-0000-4000-8000-000000000002',
  publishedArticle: '99700000-0000-4000-8000-000000000001',
  draftArticle: '99700000-0000-4000-8000-000000000002',
  futureArticle: '99700000-0000-4000-8000-000000000003',
  readyMedia: '99800000-0000-4000-8000-000000000001',
  processingMedia: '99800000-0000-4000-8000-000000000002',
  videoMedia: '99800000-0000-4000-8000-000000000003',
  deletedMedia: '99800000-0000-4000-8000-000000000004',
  mediaVariant: '99900000-0000-4000-8000-000000000001',
} as const;

const scaleBusinessIds = Array.from(
  { length: 60 },
  (_, index) => `99510000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
);

class QueryCounter {
  count = 0;

  logQuery(): void {
    this.count += 1;
  }

  reset(): void {
    this.count = 0;
  }
}

const storage: IMediaStorage = {
  upload: async () => undefined,
  download: async () => Buffer.alloc(0),
  delete: async () => undefined,
  exists: async () => true,
  getUrl: async (key) => `/uploads/${key}`,
};

integrationDescribe('Public catalog PostgreSQL read-model integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let repository: DrizzlePublicCatalogRepository;
  let service: PublicCatalogService;
  const queryCounter = new QueryCounter();

  const businessQuery = (
    overrides: Partial<PublicCatalogListQuery> = {}
  ): PublicCatalogListQuery => ({
    kind: 'businesses',
    limit: 20,
    cursor: null,
    sort: 'newest',
    regionSlug: 'pc-public-region',
    businessTypeSlug: null,
    categorySlug: null,
    amenitySlugs: [],
    parentRegionSlug: null,
    ...overrides,
  });

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      await transaction`DELETE FROM business_public_contacts WHERE business_id IN (${ids.businessOne}, ${ids.businessTwo})`;
      await transaction`DELETE FROM media_variants WHERE id = ${ids.mediaVariant}`;
      await transaction`DELETE FROM media WHERE id IN (${ids.readyMedia}, ${ids.processingMedia}, ${ids.videoMedia}, ${ids.deletedMedia})`;
      await transaction`DELETE FROM business_amenities WHERE business_id IN (${ids.businessOne}, ${ids.inactiveBusiness})`;
      await transaction`DELETE FROM articles WHERE id IN (${ids.publishedArticle}, ${ids.draftArticle}, ${ids.futureArticle})`;
      await transaction`DELETE FROM attractions WHERE id IN (${ids.publicAttraction}, ${ids.privateAttraction})`;
      await transaction`DELETE FROM businesses WHERE id IN ${transaction(scaleBusinessIds)}`;
      await transaction`DELETE FROM businesses WHERE id IN (${ids.businessOne}, ${ids.businessTwo}, ${ids.inactiveBusiness}, ${ids.deletedBusiness}, ${ids.inactiveTypeBusiness}, ${ids.deletedRegionBusiness})`;
      await transaction`DELETE FROM article_categories WHERE id IN (${ids.publicArticleCategory}, ${ids.privateArticleCategory})`;
      await transaction`DELETE FROM attraction_categories WHERE id IN (${ids.publicAttractionCategory}, ${ids.privateAttractionCategory})`;
      await transaction`DELETE FROM amenities WHERE id IN (${ids.publicAmenity}, ${ids.privateAmenity})`;
      await transaction`DELETE FROM business_types WHERE id IN (${ids.activeType}, ${ids.inactiveType})`;
      await transaction`DELETE FROM regions WHERE id IN (${ids.activeRegion}, ${ids.deletedRegion}, ${ids.scaleRegion})`;
      await transaction`DELETE FROM users WHERE id = ${ids.user}`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      await transaction`INSERT INTO users (id, email, password_hash, status)
        VALUES (${ids.user}, 'public-catalog-integration@example.test', 'integration-test-only', 'active')`;
      await transaction`INSERT INTO regions (id, name, slug, level, path, deleted_at)
        VALUES
          (${ids.activeRegion}, 'Public Region', 'pc-public-region', 3, 'pc_public_region'::ltree, NULL),
          (${ids.deletedRegion}, 'Deleted Region', 'pc-deleted-region', 3, 'pc_deleted_region'::ltree, CURRENT_TIMESTAMP),
          (${ids.scaleRegion}, 'Scale Region', 'pc-scale-region', 3, 'pc_scale_region'::ltree, NULL)`;
      await transaction`INSERT INTO business_types (id, code, name, is_active, sort_order)
        VALUES
          (${ids.activeType}, 'pc-active-type', 'Active Type', TRUE, 1),
          (${ids.inactiveType}, 'pc-inactive-type', 'Inactive Type', FALSE, 2)`;
      await transaction`INSERT INTO amenities (id, code, name, category)
        VALUES
          (${ids.publicAmenity}, 'pc-public-amenity', 'Public Amenity', 'service'),
          (${ids.privateAmenity}, 'pc-private-amenity', 'Private Amenity', 'service')`;
      await transaction`INSERT INTO attraction_categories (id, code, name, is_utility)
        VALUES
          (${ids.publicAttractionCategory}, 'pc-public-attraction', 'Public Attraction', FALSE),
          (${ids.privateAttractionCategory}, 'pc-private-attraction', 'Private Attraction', FALSE)`;
      await transaction`INSERT INTO article_categories (id, code, name)
        VALUES
          (${ids.publicArticleCategory}, 'pc-public-article', 'Public Article'),
          (${ids.privateArticleCategory}, 'pc-private-article', 'Private Article')`;
      await transaction`INSERT INTO businesses
        (id, region_id, business_type_id, name, slug, location, description, status, price_min, price_max, updated_at, deleted_at)
        VALUES
          (${ids.businessOne}, ${ids.activeRegion}, ${ids.activeType}, 'Alpha Public Business', 'pc-alpha-public-business', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, '<p>Alpha public.</p>', 'active', 100000, 200000, '2026-07-20T05:00:00Z', NULL),
          (${ids.businessTwo}, ${ids.activeRegion}, ${ids.activeType}, 'Beta Public Business', 'pc-beta-public-business', ST_SetSRID(ST_MakePoint(104.99, 22.76), 4326)::geography, '<p>Beta public.</p>', 'active', 120000, 220000, '2026-07-19T05:00:00Z', NULL),
          (${ids.inactiveBusiness}, ${ids.activeRegion}, ${ids.activeType}, 'Inactive Business', 'pc-inactive-business', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, NULL, 'inactive', NULL, NULL, CURRENT_TIMESTAMP, NULL),
          (${ids.deletedBusiness}, ${ids.activeRegion}, ${ids.activeType}, 'Deleted Business', 'pc-deleted-business', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, NULL, 'active', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          (${ids.inactiveTypeBusiness}, ${ids.activeRegion}, ${ids.inactiveType}, 'Inactive Type Business', 'pc-inactive-type-business', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, NULL, 'active', NULL, NULL, CURRENT_TIMESTAMP, NULL),
          (${ids.deletedRegionBusiness}, ${ids.deletedRegion}, ${ids.activeType}, 'Deleted Region Business', 'pc-deleted-region-business', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, NULL, 'active', NULL, NULL, CURRENT_TIMESTAMP, NULL)`;
      await transaction`INSERT INTO business_amenities (business_id, amenity_id)
        VALUES
          (${ids.businessOne}, ${ids.publicAmenity}),
          (${ids.inactiveBusiness}, ${ids.privateAmenity})`;
      for (const [index, businessId] of scaleBusinessIds.entries()) {
        await transaction`INSERT INTO businesses
          (id, region_id, business_type_id, name, slug, location, description, status, updated_at)
          VALUES (
            ${businessId}, ${ids.scaleRegion}, ${ids.activeType},
            ${`Scale Business ${String(index).padStart(2, '0')}`},
            ${`pc-scale-business-${index}`},
            ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography,
            'Representative public-catalog performance fixture', 'active',
            ${new Date(Date.UTC(2026, 6, 20, 0, 0, index)).toISOString()}
          )`;
      }
      await transaction`INSERT INTO business_public_contacts
        (business_id, phone_e164, zalo_url, website_url, publication_status, consent_confirmed_at, verified_at)
        VALUES
          (${ids.businessOne}, '+84901234567', 'https://zalo.me/pc-public', 'https://example.com/public', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          (${ids.businessTwo}, '+84907654321', NULL, NULL, 'draft', NULL, NULL)`;
      await transaction`INSERT INTO attractions
        (id, region_id, category_id, name, slug, location, status)
        VALUES
          (${ids.publicAttraction}, ${ids.activeRegion}, ${ids.publicAttractionCategory}, 'Public Attraction', 'pc-public-attraction-item', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, 'active'),
          (${ids.privateAttraction}, ${ids.activeRegion}, ${ids.privateAttractionCategory}, 'Private Attraction', 'pc-private-attraction-item', ST_SetSRID(ST_MakePoint(104.98, 22.75), 4326)::geography, 'inactive')`;
      await transaction`INSERT INTO articles
        (id, title, slug, excerpt, content, author_id, category_id, status, published_at)
        VALUES
          (${ids.publishedArticle}, 'Published Article', 'pc-published-article', 'Published excerpt', 'Published content', ${ids.user}, ${ids.publicArticleCategory}, 'published', '2026-07-01T00:00:00Z'),
          (${ids.draftArticle}, 'Draft Article', 'pc-draft-article', 'Draft excerpt', 'Draft content', ${ids.user}, ${ids.privateArticleCategory}, 'draft', NULL),
          (${ids.futureArticle}, 'Future Article', 'pc-future-article', 'Future excerpt', 'Future content', ${ids.user}, ${ids.privateArticleCategory}, 'published', '2099-01-01T00:00:00Z')`;
      await transaction`INSERT INTO media
        (id, file_name, storage_key, mime_type, media_type, file_size, hash, status, storage_provider, alt_text, owner_type, owner_id, uploaded_by, created_at, deleted_at)
        VALUES
          (${ids.readyMedia}, 'ready.webp', 'public-catalog/ready.webp', 'image/webp', 'IMAGE', 1000, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'READY', 'LOCAL', 'Ready image', 'BUSINESS', ${ids.businessOne}, ${ids.user}, '2026-07-01T00:00:00Z', NULL),
          (${ids.processingMedia}, 'processing.webp', 'public-catalog/processing.webp', 'image/webp', 'IMAGE', 1000, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'PROCESSING', 'LOCAL', 'Processing image', 'BUSINESS', ${ids.businessOne}, ${ids.user}, '2026-07-02T00:00:00Z', NULL),
          (${ids.videoMedia}, 'video.mp4', 'public-catalog/video.mp4', 'video/mp4', 'VIDEO', 1000, 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'READY', 'LOCAL', 'Video', 'BUSINESS', ${ids.businessOne}, ${ids.user}, '2026-07-03T00:00:00Z', NULL),
          (${ids.deletedMedia}, 'deleted.webp', 'public-catalog/deleted.webp', 'image/webp', 'IMAGE', 1000, 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'READY', 'LOCAL', 'Deleted image', 'BUSINESS', ${ids.businessOne}, ${ids.user}, '2026-07-04T00:00:00Z', CURRENT_TIMESTAMP)`;
      await transaction`INSERT INTO media_variants
        (id, media_id, variant_type, storage_key, width, height, file_size)
        VALUES (${ids.mediaVariant}, ${ids.readyMedia}, 'large', 'public-catalog/ready-large.webp', 1600, 900, 900)`;
    });
  }

  async function snapshot(): Promise<string> {
    const [row] = await sqlClient<{ snapshot: string }[]>`
      SELECT jsonb_build_object(
        'businesses', (SELECT COUNT(*) FROM businesses WHERE id::text LIKE '99500000-%'),
        'contacts', (SELECT COUNT(*) FROM business_public_contacts WHERE business_id::text LIKE '99500000-%'),
        'media', (SELECT COUNT(*) FROM media WHERE id::text LIKE '99800000-%'),
        'articles', (SELECT COUNT(*) FROM articles WHERE id::text LIKE '99700000-%')
      )::text AS snapshot
    `;
    return row?.snapshot ?? '';
  }

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    sqlClient = postgres(testDatabaseUrl, { max: 8, prepare: false });
    const [databaseRow] = await sqlClient<{ name: string }[]>`SELECT current_database() AS name`;
    if (!databaseRow?.name.endsWith('_test')) {
      throw new Error('Public catalog integration tests require a database ending in _test');
    }
    const database = drizzle(sqlClient, { schema, logger: queryCounter }) as Database;
    repository = new DrizzlePublicCatalogRepository(database);
    service = new PublicCatalogService(
      repository,
      new PublicCatalogCursorCodec({
        activeKeyId: 'test-v1',
        keys: { 'test-v1': 'public-catalog-integration-secret-at-least-32-bytes' },
      }),
      new MediaStorageResolver(storage, storage),
      'http://localhost:3000'
    );
    await cleanFixtures();
    await seedFixtures();
    queryCounter.reset();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    try {
      await cleanFixtures();
    } finally {
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('enforces list-detail eligibility parity and uses one query per projection', async () => {
    queryCounter.reset();
    const page = await repository.findPage({ ...businessQuery(), after: null });
    expect(queryCounter.count).toBe(1);
    expect(page.map((entry) => entry.id)).toEqual([ids.businessOne, ids.businessTwo]);

    for (const slug of [
      'pc-inactive-business',
      'pc-deleted-business',
      'pc-inactive-type-business',
      'pc-deleted-region-business',
    ]) {
      expect(await repository.findDetail('businesses', slug)).toBeNull();
    }
    expect(await repository.findDetail('businesses', 'pc-alpha-public-business')).not.toBeNull();
  });

  test('paginates a stable keyset without duplicate or omission', async () => {
    const first = await service.list(businessQuery({ limit: 1 }));
    expect(first.data.map((entry) => entry.id)).toEqual([ids.businessOne]);
    expect(first.meta.hasMore).toBe(true);
    expect(first.meta.nextCursor).toBeString();

    const second = await service.list(businessQuery({ limit: 1, cursor: first.meta.nextCursor }));
    expect(second.data.map((entry) => entry.id)).toEqual([ids.businessTwo]);
    expect(second.meta.hasMore).toBe(false);
    expect(new Set([...first.data, ...second.data].map((entry) => entry.id)).size).toBe(2);
  });

  test('returns only owner-scoped READY IMAGE media and eligible contact', async () => {
    queryCounter.reset();
    const publicDetail = await service.detail('businesses', 'pc-alpha-public-business');
    expect(queryCounter.count).toBe(1);
    expect(publicDetail.data.media).toEqual([
      {
        id: ids.readyMedia,
        url: 'http://localhost:3000/uploads/public-catalog/ready-large.webp',
        width: 1600,
        height: 900,
        altText: 'Ready image',
      },
    ]);
    expect(publicDetail.data.contact).toMatchObject({
      phoneTel: '+84901234567',
      zaloUrl: 'https://zalo.me/pc-public',
      websiteUrl: 'https://example.com/public',
    });
    expect(publicDetail.data.related).toEqual([
      {
        kind: 'business',
        id: ids.businessTwo,
        name: 'Beta Public Business',
        slug: 'pc-beta-public-business',
        canonicalPath: '/co-so/pc-beta-public-business',
      },
    ]);

    const draftContact = await service.detail('businesses', 'pc-beta-public-business');
    expect(draftContact.data.contact).toBeNull();
  });

  test('publishes only references backed by eligible public records', async () => {
    expect((await service.references('business-types')).data.map((entry) => entry.slug)).toEqual([
      'pc-active-type',
    ]);
    expect((await service.references('amenities')).data.map((entry) => entry.slug)).toEqual([
      'pc-public-amenity',
    ]);
    expect(
      (await service.references('attraction-categories')).data.map((entry) => entry.slug)
    ).toEqual(['pc-public-attraction']);
    expect(
      (await service.references('article-categories')).data.map((entry) => entry.slug)
    ).toEqual(['pc-public-article']);
  });

  test('database constraints reject a published contact without consent or verification', async () => {
    let rejected = false;
    try {
      await sqlClient`UPDATE business_public_contacts
        SET publication_status = 'published'
        WHERE business_id = ${ids.businessTwo}`;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    const draftContact = await service.detail('businesses', 'pc-beta-public-business');
    expect(draftContact.data.contact).toBeNull();
  });

  test('all public catalog paths are zero-write', async () => {
    const before = await snapshot();
    await service.list(businessQuery({ limit: 1 }));
    await service.detail('businesses', 'pc-alpha-public-business');
    await service.references('business-types');
    await service.references('amenities');
    expect(await snapshot()).toBe(before);
  });

  test('keeps representative 50-row list and related detail p95 below 500 ms', async () => {
    const listSamples: number[] = [];
    const detailSamples: number[] = [];
    const scaleQuery = businessQuery({ limit: 50, regionSlug: 'pc-scale-region' });
    for (let index = 0; index < 12; index += 1) {
      let startedAt = performance.now();
      const page = await service.list(scaleQuery);
      listSamples.push(performance.now() - startedAt);
      expect(page.data).toHaveLength(50);

      startedAt = performance.now();
      const detail = await service.detail('businesses', 'pc-scale-business-0');
      detailSamples.push(performance.now() - startedAt);
      expect(detail.data.related).toHaveLength(6);
    }
    const p95 = (samples: number[]): number => {
      const ordered = [...samples].sort((left, right) => left - right);
      return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
    };
    expect(p95(listSamples)).toBeLessThan(500);
    expect(p95(detailSamples)).toBeLessThan(500);
  });
});
