import { describe, expect, mock, spyOn, test } from 'bun:test';
import { logger } from '@/lib/logger';
import type { IMediaRepository } from '../repository/media-repository.interface';
import { MediaPurgeService } from './media-purge.service';

describe('MediaPurgeService', () => {
  test('deletes master and variants sequentially before hard-deleting the expired row', async () => {
    const calls: string[] = [];
    const repository = {
      listPurgeCandidates: mock(async () => [
        {
          id: 'media-1',
          storageProvider: 'CLOUDINARY' as const,
          storageKey: 'media-1/master',
          variantKeys: ['media-1/thumbnail', 'media-1/medium'],
        },
      ]),
      hardDeletePurged: mock(async () => {
        calls.push('db');
      }),
    } as unknown as IMediaRepository;
    const storage = {
      delete: mock(async (key: string) => {
        calls.push(key);
      }),
    };
    const resolver = { resolve: mock(() => storage) };
    const service = new MediaPurgeService(repository, resolver as never);

    const result = await service.purgeExpired({
      now: new Date('2026-07-17T00:00:00.000Z'),
      retentionDays: 30,
      limit: 10,
    });

    expect(result).toEqual({ candidates: 1, purged: 1, failed: 0 });
    expect(calls).toEqual(['media-1/master', 'media-1/thumbnail', 'media-1/medium', 'db']);
  });

  test('keeps the database row retryable when provider cleanup fails', async () => {
    const repository = {
      listPurgeCandidates: mock(async () => [
        {
          id: 'media-2',
          storageProvider: 'CLOUDINARY' as const,
          storageKey: 'media-2/master',
          variantKeys: [],
        },
      ]),
      hardDeletePurged: mock(async () => undefined),
    } as unknown as IMediaRepository;
    const storage = { delete: mock(async () => Promise.reject(new Error('provider failure'))) };
    const resolver = { resolve: mock(() => storage) };
    const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const service = new MediaPurgeService(repository, resolver as never);
      const result = await service.purgeExpired();
      expect(result).toEqual({ candidates: 1, purged: 0, failed: 1 });
      expect(repository.hardDeletePurged).not.toHaveBeenCalled();
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain('provider failure');
    } finally {
      logSpy.mockRestore();
    }
  });
});
