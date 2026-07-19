import { logger } from '@/lib/logger';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { MediaStorageResolver } from './media-storage.resolver';

export interface MediaPurgeResult {
  candidates: number;
  purged: number;
  failed: number;
}

export class MediaPurgeService {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly storageResolver: MediaStorageResolver
  ) {}

  public async purgeExpired(props?: {
    now?: Date;
    retentionDays?: number;
    limit?: number;
  }): Promise<MediaPurgeResult> {
    const now = props?.now ?? new Date();
    const retentionDays = props?.retentionDays ?? 30;
    const limit = props?.limit ?? 100;
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      throw new RangeError('Media purge retentionDays must be an integer between 1 and 3650');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new RangeError('Media purge limit must be an integer between 1 and 500');
    }

    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const candidates = await this.mediaRepository.listPurgeCandidates(cutoff, limit);
    let purged = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const storage = this.storageResolver.resolve(candidate.storageProvider);
        for (const key of [candidate.storageKey, ...candidate.variantKeys]) {
          await storage.delete(key);
        }
        await this.mediaRepository.hardDeletePurged(candidate.id, cutoff);
        purged += 1;
      } catch (error: unknown) {
        failed += 1;
        logger.error(
          {
            mediaId: candidate.id,
            stage: 'retention-purge',
            errorClass: error instanceof Error ? error.name : 'UnknownError',
          },
          'Media retention purge failed; candidate remains retryable'
        );
      }
    }

    return { candidates: candidates.length, purged, failed };
  }
}
