import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { harvestUpdates, regions, users } from '@/lib/database/schema';
import type { IRegionsRepository } from '@/modules/regions/repository/regions-repository.interface';
import { HarvestMediaOwnershipAdapter } from './ports/media-ownership.adapter';
import { HarvestStatusRepository } from './repository/harvest-status.repository';
import { HarvestStatusService } from './service/harvest-status.service';

const testDatabaseUrl =
  process.env.HARVEST_TEST_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  process.env.IDENTITY_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('Harvest status PostgreSQL integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;
  let service: HarvestStatusService;
  const adminId = randomUUID();
  const regionId = randomUUID();
  const createdHarvestIds: string[] = [];

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    sqlClient = postgres(testDatabaseUrl, { max: 4, prepare: false });
    dbClient = drizzle(sqlClient, { schema }) as Database;

    await dbClient.insert(users).values({
      id: adminId,
      email: `harvest-admin-${adminId}@hoangsuphi.vn`,
      passwordHash: 'test-password-hash',
      status: 'active',
    });
    await dbClient.insert(regions).values({
      id: regionId,
      name: 'Test Village',
      slug: `test-village-${adminId}`,
      path: `test_village_${adminId.replaceAll('-', '_')}`,
      level: 4,
    });

    const regionsRepo: Pick<IRegionsRepository, 'findById'> = {
      findById: async (id) => (id === regionId ? ({ id, level: 4 } as never) : null),
    };
    service = new HarvestStatusService(
      new HarvestStatusRepository(dbClient),
      new HarvestMediaOwnershipAdapter(dbClient),
      regionsRepo as IRegionsRepository,
      dbClient
    );
  });

  afterAll(async () => {
    if (!sqlClient) return;
    try {
      if (createdHarvestIds.length > 0) {
        await dbClient.delete(harvestUpdates).where(eq(harvestUpdates.regionId, regionId));
      }
      await dbClient.delete(regions).where(eq(regions.id, regionId));
      await dbClient.delete(users).where(eq(users.id, adminId));
    } finally {
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('persists the complete draft → published → archived lifecycle', async () => {
    const created = await service.create(
      {
        regionId,
        stage: 'GREEN',
        observedAt: new Date().toISOString(),
        title: 'Green season',
        summary: 'Beautiful green season across the terraced fields.',
        advisory: null,
        mediaIds: [],
      },
      adminId
    );
    createdHarvestIds.push(created.id);

    expect((await getHarvest(created.id)).status).toBe('DRAFT');
    await service.patch(created.id, { stage: 'RIPENING', title: 'Ripening season' }, adminId);
    expect((await getHarvest(created.id)).stage).toBe('RIPENING');

    await service.publish(created.id, adminId);
    const published = await getHarvest(created.id);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeInstanceOf(Date);

    await service.archive(created.id, adminId);
    expect((await getHarvest(created.id)).status).toBe('ARCHIVED');
  });

  test('allows only one concurrent publish transition', async () => {
    const created = await service.create(
      {
        regionId,
        stage: 'GOLDEN',
        observedAt: new Date().toISOString(),
        title: 'Golden season',
        summary: 'Golden rice season is approaching in the commune.',
        advisory: null,
        mediaIds: [],
      },
      adminId
    );
    createdHarvestIds.push(created.id);

    const results = await Promise.allSettled([
      service.publish(created.id, adminId),
      service.publish(created.id, adminId),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await getHarvest(created.id)).status).toBe('PUBLISHED');
  });

  test('enforces the stage and publication lifecycle constraints in PostgreSQL', async () => {
    const invalidId = randomUUID();
    createdHarvestIds.push(invalidId);
    const insertInvalidStage = async (): Promise<void> => {
      await dbClient
        .insert(harvestUpdates)
        .values({
          id: invalidId,
          regionId,
          stage: 'INVALID_STAGE',
          observedAt: new Date(),
          title: 'Invalid stage record',
          summary: 'This record must be rejected by the database constraint.',
          status: 'DRAFT',
          createdBy: adminId,
        })
        .returning({ id: harvestUpdates.id });
    };
    await expect(insertInvalidStage()).rejects.toThrow();

    const invalidPublicationId = randomUUID();
    createdHarvestIds.push(invalidPublicationId);
    const insertPublishedWithoutDate = async (): Promise<void> => {
      await dbClient
        .insert(harvestUpdates)
        .values({
          id: invalidPublicationId,
          regionId,
          stage: 'GOLDEN',
          observedAt: new Date(),
          title: 'Invalid publication record',
          summary: 'This record must have a publication timestamp when published.',
          status: 'PUBLISHED',
          createdBy: adminId,
        })
        .returning({ id: harvestUpdates.id });
    };
    await expect(insertPublishedWithoutDate()).rejects.toThrow();
  });

  async function getHarvest(id: string) {
    const [record] = await dbClient
      .select({
        id: harvestUpdates.id,
        stage: harvestUpdates.stage,
        status: harvestUpdates.status,
        publishedAt: harvestUpdates.publishedAt,
      })
      .from(harvestUpdates)
      .where(eq(harvestUpdates.id, id));
    if (!record) throw new Error(`Expected harvest update ${id} to exist`);
    return record;
  }
});
