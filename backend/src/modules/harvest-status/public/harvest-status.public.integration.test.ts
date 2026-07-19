import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { count, eq, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { harvestUpdates, media, mediaVariants, regions, users } from '@/lib/database/schema';
import type { IMediaStorage } from '@/modules/media/domain/storage.interface';
import { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import { HarvestStatusCursorCodec } from './harvest-status.cursor';
import { DrizzleHarvestStatusReadRepository } from './harvest-status.read-repository';
import { HarvestStatusPublicService } from './harvest-status.public.service';
import { HarvestStatusPublicController } from './harvest-status.public.controller';
import { container } from '@/common/di/container';
import { createApp } from '../../../app';

const testDatabaseUrl =
  process.env.HARVEST_TEST_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  process.env.IDENTITY_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

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

integrationDescribe('Harvest public read-model PostgreSQL integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let database: Database;
  let service: HarvestStatusPublicService;
  const queryCounter = new QueryCounter();
  const actorId = randomUUID();
  const communeId = randomUUID();
  const villageId = randomUUID();
  const emptyVillageId = randomUUID();
  const wrongLevelId = randomUUID();
  const deletedRegionId = randomUUID();
  const allRegionIds = [communeId, villageId, emptyVillageId, wrongLevelId, deletedRegionId];
  const scaleRegionIds = Array.from({ length: 20 }, () => randomUUID());
  allRegionIds.push(...scaleRegionIds);
  const allHarvestIds: string[] = [];
  const allMediaIds: string[] = [];

  const runMarker = randomUUID().replaceAll('-', '').slice(0, 12);
  const communeSlug = `harvest-commune-${runMarker}`;
  const villageSlug = `harvest-village-${runMarker}`;
  const emptyVillageSlug = `harvest-empty-${runMarker}`;
  const wrongLevelSlug = `harvest-district-${runMarker}`;
  const deletedRegionSlug = `harvest-deleted-${runMarker}`;

  const observedOld = new Date('2026-07-01T01:00:00.000Z');
  const observedCommune = new Date('2026-07-10T01:00:00.000Z');
  const observedVillage = new Date('2026-07-20T01:00:00.000Z');
  const publishedEarly = new Date('2026-07-20T02:00:00.000Z');
  const publishedLate = new Date('2026-07-20T03:00:00.000Z');
  const tiePrefix = randomUUID().slice(0, 24);
  const tieOneId = `${tiePrefix}000000000001`;
  const tieTwoId = `${tiePrefix}000000000002`;
  const currentVillageId = `${tiePrefix}000000000003`;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    sqlClient = postgres(testDatabaseUrl, { max: 12, prepare: false });
    const currentDatabase = await sqlClient<{ current_database: string }[]>`SELECT current_database()`;
    if (!currentDatabase[0]?.current_database.endsWith('_test')) {
      throw new Error('Harvest integration tests require a database name ending in _test');
    }
    database = drizzle(sqlClient, { schema, logger: queryCounter }) as Database;

    await database.insert(users).values({
      id: actorId,
      email: `harvest-public-${runMarker}@example.test`,
      passwordHash: 'integration-test-only',
      status: 'active',
    });
    await database.insert(regions).values([
      region(communeId, 'Alpha Commune', communeSlug, 3),
      region(villageId, 'Beta Village', villageSlug, 4),
      region(emptyVillageId, 'Empty Village', emptyVillageSlug, 4),
      region(wrongLevelId, 'Wrong District', wrongLevelSlug, 2),
      { ...region(deletedRegionId, 'Deleted Village', deletedRegionSlug, 4), deletedAt: new Date() },
      ...scaleRegionIds.map((id, index) =>
        region(id, `Scale Village ${String(index).padStart(2, '0')}`, `harvest-scale-${runMarker}-${index}`, 4)
      ),
    ]);

    await insertHarvest(communeId, randomUUID(), 'PUBLISHED', observedCommune, publishedEarly);
    await insertHarvest(villageId, randomUUID(), 'PUBLISHED', observedOld, publishedEarly);
    await insertHarvest(villageId, tieOneId, 'PUBLISHED', observedVillage, publishedEarly);
    await insertHarvest(villageId, tieTwoId, 'PUBLISHED', observedVillage, publishedLate);
    await insertHarvest(villageId, currentVillageId, 'PUBLISHED', observedVillage, publishedLate);
    await insertHarvest(villageId, randomUUID(), 'DRAFT', new Date('2026-08-01T00:00:00.000Z'), null);
    await insertHarvest(
      villageId,
      randomUUID(),
      'ARCHIVED',
      new Date('2026-08-02T00:00:00.000Z'),
      new Date('2026-08-02T01:00:00.000Z')
    );
    await insertHarvest(
      villageId,
      randomUUID(),
      'PUBLISHED',
      new Date('2026-08-03T00:00:00.000Z'),
      new Date('2026-08-03T01:00:00.000Z'),
      new Date()
    );
    await insertHarvest(wrongLevelId, randomUUID(), 'PUBLISHED', new Date(), new Date());
    await insertHarvest(deletedRegionId, randomUUID(), 'PUBLISHED', new Date(), new Date());
    for (const [index, regionId] of scaleRegionIds.entries()) {
      await insertHarvest(
        regionId as string,
        randomUUID(),
        'PUBLISHED',
        new Date(Date.UTC(2026, 5, 20 - index, 1)),
        new Date(Date.UTC(2026, 5, 20 - index, 2))
      );
    }
    const loadRegionId = scaleRegionIds[0] as string;
    for (let index = 0; index < 49; index += 1) {
      await insertHarvest(
        loadRegionId,
        randomUUID(),
        'PUBLISHED',
        new Date(Date.UTC(2026, 4, 31 - index, 1)),
        new Date(Date.UTC(2026, 4, 31 - index, 2))
      );
    }

    const readyMediaIds: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      const id = randomUUID();
      readyMediaIds.push(id);
      await insertMedia({
        id,
        ownerId: currentVillageId,
        mediaType: 'IMAGE',
        status: 'READY',
        createdAt: new Date(Date.UTC(2026, 6, 1, 0, 0, index)),
      });
    }
    await database.insert(mediaVariants).values({
      id: randomUUID(),
      mediaId: readyMediaIds[0] as string,
      variantType: 'large',
      storageKey: `harvest/${readyMediaIds[0]}/large.webp`,
      width: 1600,
      height: 900,
      fileSize: 1000,
    });
    await insertMedia({ id: randomUUID(), ownerId: currentVillageId, mediaType: 'IMAGE', status: 'PROCESSING' });
    await insertMedia({ id: randomUUID(), ownerId: currentVillageId, mediaType: 'VIDEO', status: 'READY' });
    await insertMedia({ id: randomUUID(), ownerId: currentVillageId, mediaType: 'IMAGE', status: 'READY', deletedAt: new Date() });
    await insertMedia({ id: randomUUID(), ownerId: tieTwoId, mediaType: 'IMAGE', status: 'READY' });

    const repository = new DrizzleHarvestStatusReadRepository(database);
    const cursor = new HarvestStatusCursorCodec({
      activeKeyId: 'v1',
      keys: { v1: 'harvest-public-integration-secret-32-bytes-minimum' },
    });
    service = new HarvestStatusPublicService(
      repository,
      cursor,
      new MediaStorageResolver(storage, storage),
      'http://localhost:3000'
    );
    container.register(
      'HarvestStatusPublicController',
      new HarvestStatusPublicController(service)
    );
    queryCounter.reset();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    try {
      if (allMediaIds.length > 0) {
        await database.delete(mediaVariants).where(inArray(mediaVariants.mediaId, allMediaIds));
        await database.delete(media).where(inArray(media.id, allMediaIds));
      }
      if (allHarvestIds.length > 0) {
        await database.delete(harvestUpdates).where(inArray(harvestUpdates.id, allHarvestIds));
      }
      await database.delete(regions).where(inArray(regions.id, allRegionIds));
      await database.delete(users).where(eq(users.id, actorId));
    } finally {
      container.reset();
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('selects one current PUBLISHED update per eligible region using all tie-breaks', async () => {
    queryCounter.reset();
    const result = await service.getCurrent({ limit: 50 });
    expect(queryCounter.count).toBe(1);
    expect(result.data).toHaveLength(22);
    expect(result.data[0]?.region.id).toBe(villageId);
    expect(result.data[0]?.current.id).toBe(currentVillageId);
    expect(result.data[1]?.region.id).toBe(communeId);
    expect(result.data.some((item) => item.region.id === wrongLevelId)).toBe(false);
    expect(result.data.some((item) => item.region.id === deletedRegionId)).toBe(false);
    expect(result.data.some((item) => item.region.id === emptyVillageId)).toBe(false);
  });

  test('returns only deterministic READY IMAGE media for the exact owner, capped at eight, without internals', async () => {
    const result = await service.getCurrent({ limit: 20 });
    const item = result.data.find((entry) => entry.region.id === villageId);
    expect(item?.current.media).toHaveLength(8);
    expect(item?.current.media[0]?.variant).toBe('large');
    expect(item?.current.media[0]?.url).toStartWith('http://localhost:3000/uploads/');

    const serialized = JSON.stringify(item);
    for (const forbidden of [
      'storageKey',
      'storageProvider',
      'ownerType',
      'ownerId',
      'uploadedBy',
      'createdBy',
      'deletedAt',
      'PROCESSING',
      'VIDEO',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test('paginates current rows and timeline without duplicate or omission and preserves global current', async () => {
    const currentIds: string[] = [];
    let currentCursor: string | undefined;
    for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
      const page = await service.getCurrent({ limit: 10, cursor: currentCursor });
      currentIds.push(...page.data.map((item) => item.region.id));
      currentCursor = page.pagination.nextCursor ?? undefined;
      if (!currentCursor) break;
    }
    expect(currentIds).toHaveLength(22);
    expect(new Set(currentIds).size).toBe(22);

    const collected: string[] = [];
    let cursor: string | undefined;
    for (let pageNumber = 0; pageNumber < 6; pageNumber += 1) {
      queryCounter.reset();
      const page = await service.getRegionTimeline(villageSlug, { limit: 1, cursor });
      expect(queryCounter.count).toBe(2);
      expect(page.data.current?.id).toBe(currentVillageId);
      collected.push(...page.data.timeline.map((update) => update.id));
      cursor = page.pagination.nextCursor ?? undefined;
      if (!cursor) break;
    }
    expect(collected).toEqual([currentVillageId, tieTwoId, tieOneId, expect.any(String)]);
    expect(new Set(collected).size).toBe(collected.length);
  });

  test('keeps query counts constant for 20+ current regions and a 50-row timeline', async () => {
    queryCounter.reset();
    const current = await service.getCurrent({ limit: 50 });
    expect(current.data.length).toBeGreaterThanOrEqual(20);
    expect(queryCounter.count).toBe(1);

    queryCounter.reset();
    const timeline = await service.getRegionTimeline(`harvest-scale-${runMarker}-0`, { limit: 50 });
    expect(timeline.data.timeline).toHaveLength(50);
    expect(queryCounter.count).toBe(2);
  });

  test('exercises the real anonymous HTTP chain with no-store and generic unavailable responses', async () => {
    const currentResponse = await createApp().request('/api/v1/harvest-status?limit=50');
    expect(currentResponse.status).toBe(200);
    expect(currentResponse.headers.get('cache-control')).toBe('no-store');
    const currentBody = await currentResponse.json();
    expect(currentBody.data).toHaveLength(22);
    expect(JSON.stringify(currentBody)).not.toContain('storageKey');

    const publicErrors = [];
    for (const slug of ['does-not-exist', wrongLevelSlug, deletedRegionSlug]) {
      const response = await createApp().request(`/api/v1/harvest-status/regions/${slug}`);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = await response.json();
      publicErrors.push({ status: body.status, code: body.code, detail: body.detail });
    }
    expect(new Set(publicErrors.map((error) => JSON.stringify(error))).size).toBe(1);
  });

  test('returns a valid empty timeline and one generic unavailable error for invalid regions', async () => {
    const empty = await service.getRegionTimeline(emptyVillageSlug, { limit: 20 });
    expect(empty.data.current).toBeNull();
    expect(empty.data.timeline).toEqual([]);

    for (const slug of ['does-not-exist', wrongLevelSlug, deletedRegionSlug]) {
      try {
        await service.getRegionTimeline(slug, { limit: 20 });
        throw new Error('Expected unavailable region');
      } catch (error) {
        expect(error).toMatchObject({
          statusCode: 404,
          errorCode: 'HARVEST_REGION_NOT_FOUND_OR_UNAVAILABLE',
        });
      }
    }
  });

  test('concurrent reads remain deterministic and do not mutate database or media ownership', async () => {
    const before = await snapshot();
    const results = await Promise.all([
      ...Array.from({ length: 10 }, () => service.getCurrent({ limit: 20 })),
      ...Array.from({ length: 10 }, () => service.getRegionTimeline(villageSlug, { limit: 20 })),
    ]);
    expect(results).toHaveLength(20);
    expect(await snapshot()).toEqual(before);
  });

  async function insertHarvest(
    regionId: string,
    id: string,
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    observedAt: Date,
    publishedAt: Date | null,
    deletedAt: Date | null = null
  ): Promise<void> {
    allHarvestIds.push(id);
    await database.insert(harvestUpdates).values({
      id,
      regionId,
      stage: status === 'DRAFT' ? 'GREEN' : 'GOLDEN',
      observedAt,
      title: `Harvest ${id}`,
      summary: 'Public harvest integration fixture with sufficient summary length.',
      advisory: null,
      status,
      createdBy: actorId,
      publishedAt,
      deletedAt,
    });
  }

  async function insertMedia(input: {
    id: string;
    ownerId: string;
    mediaType: string;
    status: string;
    createdAt?: Date;
    deletedAt?: Date;
  }): Promise<void> {
    allMediaIds.push(input.id);
    await database.insert(media).values({
      id: input.id,
      fileName: `${input.id}.webp`,
      storageKey: `harvest/${input.id}/master.webp`,
      mimeType: input.mediaType === 'VIDEO' ? 'video/mp4' : 'image/webp',
      mediaType: input.mediaType,
      fileSize: 500,
      hash: createHash('sha256').update(input.id).digest('hex'),
      status: input.status,
      storageProvider: 'LOCAL',
      altText: 'Harvest fixture',
      ownerType: 'HARVEST_UPDATE',
      ownerId: input.ownerId,
      uploadedBy: actorId,
      createdAt: input.createdAt ?? new Date(),
      deletedAt: input.deletedAt ?? null,
    });
  }

  function region(id: string, name: string, slug: string, level: number) {
    return {
      id,
      name,
      slug,
      level,
      path: slug.replaceAll('-', '_'),
    };
  }

  async function snapshot() {
    const [harvestCount] = await database
      .select({ value: count() })
      .from(harvestUpdates)
      .where(inArray(harvestUpdates.id, allHarvestIds));
    const [mediaCount] = await database
      .select({ value: count() })
      .from(media)
      .where(inArray(media.id, allMediaIds));
    const ownership = await database
      .select({ id: media.id, ownerType: media.ownerType, ownerId: media.ownerId, updatedAt: media.updatedAt })
      .from(media)
      .where(inArray(media.id, allMediaIds))
      .orderBy(media.id);
    return {
      harvestCount: Number(harvestCount?.value ?? 0),
      mediaCount: Number(mediaCount?.value ?? 0),
      ownership: ownership.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    };
  }
});
