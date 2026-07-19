import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { media, mediaMetadata, mediaVariants } from '@/lib/database/schema/media';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Media } from '../domain/media.entity';
import type { DrizzleMediaRepository } from './media.repository';
import { InvalidLifecycleTransitionError, ScopedDuplicateConflictError } from './repository-errors';

const testDatabaseUrl = process.env.MEDIA_TEST_DATABASE_URL;
const realRepositoryEnabled = process.env.MEDIA_REPOSITORY_INTEGRATION === '1';
const integrationDescribe = testDatabaseUrl && realRepositoryEnabled ? describe : describe.skip;

const uploaderId = '018f6c38-8c10-7000-8000-000000000099';
const otherUploaderId = '018f6c38-8c10-7000-8000-000000000077';
const ownerId = '018f6c38-8c10-7000-8000-000000000088';
const sentinelId = '018f6c38-8c10-7000-8000-000000000099';
const fixtureIds = [
  '018f6c38-8c10-7000-8000-000000000001',
  '018f6c38-8c10-7000-8000-000000000002',
  '018f6c38-8c10-7000-8000-000000000003',
  '018f6c38-8c10-7000-8000-000000000004',
  '018f6c38-8c10-7000-8000-000000000005',
  '018f6c38-8c10-7000-8000-000000000006',
  '018f6c38-8c10-7000-8000-000000000007',
] as const;

function createMedia(props: {
  id: string;
  hash: string;
  uploadedBy?: string;
  ownerType?: string | null;
  ownerId?: string | null;
}): Media {
  return Media.create({
    id: props.id,
    fileName: `${props.id}.jpg`,
    storageKey: `step-4.3.2/${props.id}.jpg`,
    mimeType: 'image/jpeg',
    mediaType: 'IMAGE',
    fileSize: 1024,
    hash: props.hash,
    uploadedBy: props.uploadedBy ?? uploaderId,
    ownerType: props.ownerType ?? null,
    ownerId: props.ownerId ?? null,
  });
}

integrationDescribe('Media repository PostgreSQL integration', () => {
  let sqlClient: postgres.Sql;
  let testDb: Database;
  let repository: DrizzleMediaRepository;

  async function cleanFixtures(): Promise<void> {
    await testDb.delete(media).where(inArray(media.id, [...fixtureIds]));
  }

  async function cleanAllTestRows(): Promise<void> {
    await testDb.delete(media).where(inArray(media.id, [...fixtureIds, sentinelId]));
  }

  beforeAll(async () => {
    if (!testDatabaseUrl) return;

    sqlClient = postgres(testDatabaseUrl, { max: 5, prepare: false });
    const [databaseRow] = await sqlClient`SELECT current_database() AS "databaseName"`;
    const databaseName = databaseRow?.databaseName;
    if (typeof databaseName !== 'string' || !databaseName.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error(
        `MEDIA_TEST_DATABASE_URL must point to a database ending in "_test"; received "${String(databaseName)}"`
      );
    }

    const [indexRow] = await sqlClient`
      SELECT i.indisvalid AS "isValid", i.indisready AS "isReady"
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      WHERE c.relname = 'media_unbound_active_hash_unique_idx'
    `;
    if (indexRow?.isValid !== true || indexRow?.isReady !== true) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Required media_unbound_active_hash_unique_idx is not valid and ready');
    }

    testDb = drizzle(sqlClient, { schema });
    const realRepositoryPath = './media.repository.ts?media-postgres-integration-real';
    const realRepositoryModule = (await import(
      realRepositoryPath
    )) as typeof import('./media.repository');
    repository = new realRepositoryModule.DrizzleMediaRepository(testDb);
  });

  beforeEach(async () => {
    await cleanFixtures();
  });

  afterAll(async () => {
    if (!testDatabaseUrl || !sqlClient) return;
    await cleanAllTestRows();
    await sqlClient.end({ timeout: 5 });
  });

  test('scoped dedup isolates uploader and owner and ignores failed/deleted rows', async () => {
    const ready = createMedia({ id: fixtureIds[0], hash: 'a'.repeat(64) });
    ready.markProcessing();
    ready.markReady();
    await repository.save(ready);

    expect(
      await repository.findScopedDuplicate({
        uploaderId,
        ownerType: null,
        ownerId: null,
        hash: ready.hash,
      })
    ).not.toBeNull();
    expect(
      await repository.findScopedDuplicate({
        uploaderId: otherUploaderId,
        ownerType: null,
        ownerId: null,
        hash: ready.hash,
      })
    ).toBeNull();
    expect(
      await repository.findScopedDuplicate({
        uploaderId,
        ownerType: 'ARTICLE',
        ownerId,
        hash: ready.hash,
      })
    ).toBeNull();

    const failed = createMedia({ id: fixtureIds[1], hash: 'b'.repeat(64) });
    failed.markFailed();
    await repository.save(failed);
    expect(
      await repository.findScopedDuplicate({
        uploaderId,
        ownerType: null,
        ownerId: null,
        hash: failed.hash,
      })
    ).toBeNull();

    const deleted = createMedia({ id: fixtureIds[2], hash: 'c'.repeat(64) });
    deleted.softDelete();
    await repository.save(deleted);
    expect(
      await repository.findScopedDuplicate({
        uploaderId,
        ownerType: null,
        ownerId: null,
        hash: deleted.hash,
      })
    ).toBeNull();
  });

  test('concurrent unbound saves allow exactly one winner', async () => {
    const hash = 'd'.repeat(64);
    const first = createMedia({ id: fixtureIds[0], hash });
    const second = createMedia({ id: fixtureIds[1], hash });

    const outcomes = await Promise.allSettled([repository.save(first), repository.save(second)]);
    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ScopedDuplicateConflictError
    );
  });

  test('metadata and variants are idempotent upserts', async () => {
    const source = createMedia({ id: fixtureIds[0], hash: 'e'.repeat(64) });
    await repository.save(source);

    await repository.saveMetadata(source.id, { width: 800 });
    await repository.saveMetadata(source.id, { width: 1024, camera: 'Sony' });
    expect(await repository.getMetadata(source.id)).toEqual({ width: 1024, camera: 'Sony' });

    await repository.saveVariant({
      mediaId: source.id,
      variantType: 'thumbnail',
      storageKey: 'thumbnail-v1.webp',
      width: 100,
      height: 100,
      fileSize: 1200,
    });
    await repository.saveVariant({
      mediaId: source.id,
      variantType: 'thumbnail',
      storageKey: 'thumbnail-v2.webp',
      width: 120,
      height: 120,
      fileSize: 1500,
    });

    expect(await repository.getVariants(source.id)).toEqual([
      {
        variantType: 'thumbnail',
        storageKey: 'thumbnail-v2.webp',
        width: 120,
        height: 120,
        fileSize: 1500,
      },
    ]);
  });

  test('conditional lifecycle transitions reject stale states', async () => {
    const source = createMedia({ id: fixtureIds[0], hash: 'f'.repeat(64) });
    await repository.save(source);
    await repository.transitionToProcessing(source.id);
    await expect(repository.transitionToProcessing(source.id)).rejects.toBeInstanceOf(
      InvalidLifecycleTransitionError
    );
    await repository.transitionToFailed(source.id);
    await expect(repository.transitionToFailed(source.id)).rejects.toBeInstanceOf(
      InvalidLifecycleTransitionError
    );
  });

  test('finalization commits metadata, variants and READY status atomically', async () => {
    const source = createMedia({ id: fixtureIds[0], hash: '1'.repeat(64) });
    await repository.save(source);
    await repository.transitionToProcessing(source.id);

    await repository.finalizeProcessedMedia({
      mediaId: source.id,
      metadata: { width: 800, height: 600 },
      variants: [
        {
          variantType: 'thumbnail',
          storageKey: 'thumbnail.webp',
          width: 100,
          height: 75,
          fileSize: 500,
        },
      ],
    });

    expect((await repository.findById(source.id))?.status).toBe('READY');
    expect(await repository.getMetadata(source.id)).toEqual({ width: 800, height: 600 });
    expect(await repository.getVariants(source.id)).toHaveLength(1);
  });

  test('finalization rolls back every write when a variant fails', async () => {
    const source = createMedia({ id: fixtureIds[0], hash: '2'.repeat(64) });
    await repository.save(source);
    await repository.transitionToProcessing(source.id);

    await expect(
      repository.finalizeProcessedMedia({
        mediaId: source.id,
        metadata: { width: 800 },
        variants: [
          {
            variantType: 'x'.repeat(51),
            storageKey: 'invalid.webp',
            width: 100,
            height: 100,
            fileSize: 500,
          },
        ],
      })
    ).rejects.toBeDefined();

    expect((await repository.findById(source.id))?.status).toBe('PROCESSING');
    expect(await repository.getMetadata(source.id)).toBeNull();
    expect(await repository.getVariants(source.id)).toEqual([]);
  });

  test('legacy insert receives database defaults and remains repository-readable', async () => {
    await testDb.execute(sql`
      INSERT INTO media (
        id, file_name, storage_key, mime_type, media_type, file_size, hash, status, uploaded_by
      ) VALUES (
        ${fixtureIds[0]}, 'legacy.jpg', 'legacy.jpg', 'image/jpeg', 'IMAGE', 100,
        ${'3'.repeat(64)}, 'READY', ${uploaderId}
      )
    `);

    const [raw] = await testDb
      .select({
        storageProvider: media.storageProvider,
        altText: media.altText,
        caption: media.caption,
      })
      .from(media)
      .where(inArray(media.id, [fixtureIds[0]]));

    expect(raw).toEqual({ storageProvider: 'LOCAL', altText: null, caption: null });
    expect(await repository.findById(fixtureIds[0])).not.toBeNull();
  });

  test('fixture cleanup leaves rows outside its fixture UUID allowlist untouched', async () => {
    await testDb.insert(media).values({
      id: sentinelId,
      fileName: 'sentinel.jpg',
      storageKey: 'step-4.3.2/sentinel.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      fileSize: 100,
      hash: '4'.repeat(64),
      status: 'READY',
      uploadedBy: uploaderId,
    });

    await cleanFixtures();

    const sentinelRows = await testDb
      .select({ id: media.id })
      .from(media)
      .where(inArray(media.id, [sentinelId]));
    expect(sentinelRows).toEqual([{ id: sentinelId }]);

    const variantCount = await testDb
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, [...fixtureIds]));
    const metadataCount = await testDb
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaMetadata)
      .where(inArray(mediaMetadata.mediaId, [...fixtureIds]));
    expect(variantCount[0]?.count).toBe(0);
    expect(metadataCount[0]?.count).toBe(0);
  });

  test('soft-delete flow: row persists in DB with deleted_at set but is excluded from findById and dedup', async () => {
    const source = createMedia({ id: fixtureIds[0], hash: '5'.repeat(64) });
    source.markProcessing();
    source.markReady();
    await repository.save(source);

    // Confirm findById returns the entity before soft-delete
    expect(await repository.findById(source.id)).not.toBeNull();

    // Perform soft-delete and persist via update
    source.softDelete();
    await repository.update(source);

    // findById must return null after soft-delete (filtered by deletedAt IS NULL)
    expect(await repository.findById(source.id)).toBeNull();

    // findScopedDuplicate must also exclude soft-deleted rows
    expect(
      await repository.findScopedDuplicate({
        uploaderId,
        ownerType: null,
        ownerId: null,
        hash: source.hash,
      })
    ).toBeNull();

    // Raw DB row still exists with deleted_at populated
    const [rawRow] = await testDb
      .select({ id: media.id, deletedAt: media.deletedAt })
      .from(media)
      .where(inArray(media.id, [fixtureIds[0]]));
    expect(rawRow).toBeDefined();
    if (!rawRow) {
      throw new Error('Expected soft-deleted media fixture to remain in the database');
    }
    expect(rawRow.deletedAt).not.toBeNull();
  });

  test('retention purge candidates are bounded, include variant keys, and hard-delete conditionally', async () => {
    const source = createMedia({
      id: fixtureIds[6],
      hash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    });
    source.markProcessing();
    source.markReady();
    source.softDelete(new Date('2026-05-01T00:00:00.000Z'));
    await repository.save(source);
    await repository.saveVariant({
      mediaId: source.id,
      variantType: 'thumbnail',
      storageKey: 'step-4.3.7/purge/thumbnail',
      width: 320,
      height: 240,
      fileSize: 100,
    });

    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    const candidates = await repository.listPurgeCandidates(cutoff, 10);
    const candidate = candidates.find((item) => item.id === source.id);
    expect(candidate?.variantKeys).toEqual(['step-4.3.7/purge/thumbnail']);

    await repository.hardDeletePurged(source.id, cutoff);
    const [remaining] = await testDb
      .select({ id: media.id })
      .from(media)
      .where(sql`${media.id} = ${source.id}`);
    expect(remaining).toBeUndefined();
  });
});
