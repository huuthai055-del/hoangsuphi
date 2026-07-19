import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { media, users } from '@/lib/database/schema';
import { HarvestMediaOwnershipAdapter } from './media-ownership.adapter';

const testDatabaseUrl =
  process.env.HARVEST_TEST_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  process.env.IDENTITY_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('Harvest media ownership PostgreSQL integration', () => {
  let firstSqlClient: ReturnType<typeof postgres>;
  let secondSqlClient: ReturnType<typeof postgres>;
  let firstDb: Database;
  let secondDb: Database;
  const uploaderId = randomUUID();
  const mediaId = randomUUID();
  const firstHarvestId = randomUUID();
  const secondHarvestId = randomUUID();
  const capacityMediaIds = Array.from({ length: 9 }, () => randomUUID());

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    firstSqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    secondSqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    firstDb = drizzle(firstSqlClient, { schema }) as Database;
    secondDb = drizzle(secondSqlClient, { schema }) as Database;

    await firstDb.insert(users).values({
      id: uploaderId,
      email: `harvest-media-${uploaderId}@hoangsuphi.vn`,
      passwordHash: 'test-password-hash',
      status: 'active',
    });
    await firstDb.insert(media).values({
      id: mediaId,
      fileName: 'harvest.jpg',
      storageKey: `harvest/${mediaId}.jpg`,
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      fileSize: 1024,
      hash: 'a'.repeat(64),
      status: 'READY',
      uploadedBy: uploaderId,
    });
  });

  afterAll(async () => {
    if (!firstSqlClient || !secondSqlClient) return;
    try {
      await firstDb.delete(media).where(inArray(media.id, [mediaId, ...capacityMediaIds]));
      await firstDb.delete(users).where(eq(users.id, uploaderId));
    } finally {
      await Promise.all([firstSqlClient.end({ timeout: 5 }), secondSqlClient.end({ timeout: 5 })]);
    }
  });

  test('atomically claims unbound media for one harvest update only', async () => {
    const firstAdapter = new HarvestMediaOwnershipAdapter(firstDb);
    const secondAdapter = new HarvestMediaOwnershipAdapter(secondDb);
    const outcomes = await Promise.allSettled([
      firstDb.transaction((tx) =>
        firstAdapter.assignHarvestMedia({
          harvestUpdateId: firstHarvestId,
          mediaIds: [mediaId],
          uploaderId,
          tx,
        })
      ),
      secondDb.transaction((tx) =>
        secondAdapter.assignHarvestMedia({
          harvestUpdateId: secondHarvestId,
          mediaIds: [mediaId],
          uploaderId,
          tx,
        })
      ),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);

    const [claimed] = await firstDb
      .select({ ownerType: media.ownerType, ownerId: media.ownerId })
      .from(media)
      .where(eq(media.id, mediaId));
    expect(claimed?.ownerType).toBe('HARVEST_UPDATE');
    expect(claimed?.ownerId === firstHarvestId || claimed?.ownerId === secondHarvestId).toBe(true);
  });

  test('creates a persisted eight-image fixture', async () => {
    await firstDb.insert(media).values(
      capacityMediaIds.map((id, index) => ({
        id,
        fileName: `capacity-${index}.jpg`,
        storageKey: `harvest/capacity-${id}.jpg`,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 1024,
        hash: `${id.replaceAll('-', '')}${'b'.repeat(32)}`,
        status: 'READY',
        uploadedBy: uploaderId,
        ownerType: index < 8 ? 'HARVEST_UPDATE' : null,
        ownerId: index < 8 ? firstHarvestId : null,
      }))
    );
    const existing = await firstDb
      .select({ id: media.id })
      .from(media)
      .where(inArray(media.id, capacityMediaIds));
    expect(existing).toHaveLength(9);
  });

  test('enforces the aggregate eight-image limit when appending to a draft', async () => {
    const adapter = new HarvestMediaOwnershipAdapter(firstDb);
    let failure: unknown;
    try {
      await adapter.assignHarvestMedia({
        harvestUpdateId: firstHarvestId,
        mediaIds: [capacityMediaIds[8] ?? ''],
        uploaderId,
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('Harvest update cannot contain more than 8 images');
  });
});
