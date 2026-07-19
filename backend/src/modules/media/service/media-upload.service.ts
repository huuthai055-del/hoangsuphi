import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';
import { StorageUploadError } from '../domain/media-errors';
import { Media } from '../domain/media.entity';
import type { IMediaStorage } from '../domain/storage.interface';
import type { IMediaRepository } from '../repository/media-repository.interface';
import { MediaValidationPolicy } from './media-validation.policy';
import { StorageKeyGenerator } from './storage-key.generator';

export class MediaUploadService {
  constructor(
    private readonly mediaRepo: IMediaRepository,
    private readonly storage: IMediaStorage
  ) {}

  public async upload(props: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    ownerType?: string | null;
    ownerId?: string | null;
    uploadedBy?: string | null;
  }): Promise<Media> {
    // 1. Delegate validation policies
    const sanitizedName = MediaValidationPolicy.validateFileName(props.fileName);
    const fileSize = props.fileBuffer.length;
    const { mediaType } = MediaValidationPolicy.determineMediaTypeAndLimit(
      props.mimeType,
      fileSize
    );

    // Calculate SHA-256 hash for deduplication
    const hash = createHash('sha256').update(props.fileBuffer).digest('hex');

    // Duplicate detection check
    const existingMedia = await this.mediaRepo.findByHash(hash);
    if (existingMedia && existingMedia.status === 'READY') {
      return existingMedia;
    }

    // 2. Delegate storage key generation
    const now = new Date();
    const { id, storageKey } = StorageKeyGenerator.generate(sanitizedName, now);

    // 3. Storage Upload
    try {
      await this.storage.upload(storageKey, props.fileBuffer, props.mimeType);
    } catch {
      throw new StorageUploadError('Failed to store uploaded file');
    }

    // 4. Database Save
    const media = Media.create({
      id,
      fileName: sanitizedName,
      storageKey,
      mimeType: props.mimeType,
      mediaType,
      fileSize,
      hash,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      uploadedBy: props.uploadedBy ?? null,
      now,
    });

    try {
      await this.mediaRepo.save(media);
    } catch (dbErr) {
      // Transaction Safety Rollback: Cleanup uploaded storage file if DB save fails
      // We wrap storage delete inside try/catch to protect the original DB exception context
      try {
        await this.storage.delete(storageKey);
      } catch (cleanupErr) {
        // Log storage cleanup failure: the DB error will still be rethrown, but now
        // we have visibility that the orphaned storage file may need manual cleanup.
        logger.error(
          {
            errorClass: cleanupErr instanceof Error ? cleanupErr.name : 'UnknownError',
            mediaId: id,
          },
          'Failed to delete orphaned storage file after DB save failure'
        );
      }
      throw dbErr;
    }

    // 5. Mark Ready
    try {
      // Legacy service compatibility: preserve the mandatory lifecycle even
      // though the production upload route uses MediaIngestionService.
      media.markProcessing();
      media.markReady();
      await this.mediaRepo.update(media);
    } catch (updateErr) {
      // Cleanup both storage file and db record if confirmation fails
      try {
        await this.storage.delete(storageKey);
      } catch (cleanupErr) {
        logger.error(
          {
            errorClass: cleanupErr instanceof Error ? cleanupErr.name : 'UnknownError',
            mediaId: media.id,
          },
          'Failed to delete orphaned storage file after markReady failure'
        );
      }
      try {
        await this.mediaRepo.delete(media.id);
      } catch (cleanupErr) {
        logger.error(
          {
            errorClass: cleanupErr instanceof Error ? cleanupErr.name : 'UnknownError',
            mediaId: media.id,
          },
          'Failed to delete orphaned DB record after markReady failure'
        );
      }
      throw updateErr;
    }

    return media;
  }
}
