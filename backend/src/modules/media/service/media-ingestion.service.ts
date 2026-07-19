import { createHash } from 'node:crypto';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/common/errors/http.errors';
import { logger } from '@/lib/logger';
import type { IImageProcessor } from '../domain/image-processor.interface';
import {
  FileTooLargeError,
  MediaValidationError,
  StorageUploadError,
  UnsupportedMediaTypeError,
} from '../domain/media-errors';
import { Media } from '../domain/media.entity';
import type { IMediaStorage } from '../domain/storage.interface';
import type { IMediaRepository } from '../repository/media-repository.interface';
import { ScopedDuplicateConflictError } from '../repository/repository-errors';
import { MediaValidationPolicy } from './media-validation.policy';
import { StorageKeyGenerator } from './storage-key.generator';

function getSafeErrorClass(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }
  return 'UnknownError';
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error('Media upload request was aborted');
    error.name = 'AbortError';
    throw error;
  }
}

export class MediaIngestionService {
  constructor(
    private readonly mediaRepo: IMediaRepository,
    private readonly storage: IMediaStorage, // CloudinaryStorage
    private readonly imageProcessor: IImageProcessor
  ) {}

  public async ingest(props: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    altText?: string | null;
    caption?: string | null;
    uploadedBy: string;
    signal?: AbortSignal;
  }): Promise<{ media: Media; deduplicated: boolean }> {
    // 1. Validation before side effects
    if (!props.uploadedBy) {
      throw new AuthenticationError('Authentication required');
    }
    if (props.signal?.aborted) {
      throw new StorageUploadError('Failed to process and store media file');
    }

    const sanitizedName = MediaValidationPolicy.validateFileName(props.fileName);
    const fileSize = props.fileBuffer.length;
    const { mediaType } = MediaValidationPolicy.determineMediaTypeAndLimit(
      props.mimeType,
      fileSize
    );

    if (mediaType !== 'IMAGE') {
      throw new UnsupportedMediaTypeError('Unsupported file type: only image uploads are allowed');
    }

    MediaValidationPolicy.validateImageMagicBytes(props.fileBuffer, props.mimeType);

    const imgMeta = await this.imageProcessor.extractMetadata(props.fileBuffer);
    throwIfAborted(props.signal);
    const width = imgMeta.width ?? null;
    const height = imgMeta.height ?? null;

    // Calculate hash for scoped deduplication
    const hash = createHash('sha256').update(props.fileBuffer).digest('hex');

    // 2. Scoped Deduplication
    const duplicate = await this.mediaRepo.findScopedDuplicate({
      uploaderId: props.uploadedBy,
      ownerType: null,
      ownerId: null,
      hash,
    });

    if (duplicate) {
      if (duplicate.status === 'READY') {
        return { media: duplicate, deduplicated: true };
      }
      if (duplicate.status === 'UPLOADING' || duplicate.status === 'PROCESSING') {
        throw new ConflictError(
          'A media file with identical content is currently uploading or processing'
        );
      }
    }

    // 3. Persist UPLOADING
    const now = new Date();
    const { id, storageKey: masterKey } = StorageKeyGenerator.generate(
      sanitizedName,
      now,
      'CLOUDINARY'
    );

    const media = Media.create({
      id,
      fileName: sanitizedName,
      storageKey: masterKey,
      mimeType: props.mimeType,
      mediaType,
      fileSize,
      hash,
      storageProvider: 'CLOUDINARY',
      altText: props.altText ?? null,
      caption: props.caption ?? null,
      ownerType: null,
      ownerId: null,
      uploadedBy: props.uploadedBy,
      now,
    });

    try {
      throwIfAborted(props.signal);
      await this.mediaRepo.save(media);
    } catch (saveErr) {
      if (saveErr instanceof ScopedDuplicateConflictError) {
        throw new ConflictError('An equivalent media upload already exists or is being processed');
      }
      logger.error(
        { errorClass: getSafeErrorClass(saveErr), mediaId: id },
        'Failed to persist media row at UPLOADING stage'
      );
      throw new StorageUploadError('Failed to process and store media file');
    }

    // 4. transitionToProcessing
    try {
      await this.mediaRepo.transitionToProcessing(id);
    } catch (transErr) {
      try {
        await this.mediaRepo.transitionToFailed(id);
      } catch (failedErr) {
        logger.error(
          { errorClass: getSafeErrorClass(failedErr), mediaId: id },
          'Failed to mark media as FAILED on transition fail'
        );
      }
      logger.error(
        { errorClass: getSafeErrorClass(transErr), mediaId: id },
        'Failed to transition media to PROCESSING state'
      );
      throw new StorageUploadError('Failed to process and store media file');
    }

    const uploadedKeys: string[] = [];
    let isFinalized = false;

    try {
      throwIfAborted(props.signal);
      const variantsToSave: Array<{
        variantType: string;
        storageKey: string;
        width: number | null;
        height: number | null;
        fileSize: number;
      }> = [];

      // 5. Sharp nén master
      const { buffer: masterBuffer } = await this.imageProcessor.resize(
        props.fileBuffer,
        width ?? 1600,
        height ?? 1200,
        85
      );
      throwIfAborted(props.signal);

      uploadedKeys.push(masterKey);
      await this.storage.upload(masterKey, masterBuffer, 'image/webp');
      throwIfAborted(props.signal);

      // Upload variants sequentially using for...of
      const variantsConfig = [
        { type: 'thumbnail', width: 320, height: 320, quality: 80 },
        { type: 'medium', width: 768, height: 768, quality: 80 },
        { type: 'large', width: 1600, height: 1600, quality: 80 },
      ];

      for (const config of variantsConfig) {
        const variantKey = StorageKeyGenerator.generateVariantKey(
          id,
          config.type,
          'CLOUDINARY',
          now
        );
        uploadedKeys.push(variantKey);

        const { buffer: resizedBuffer, fileSize: variantSize } = await this.imageProcessor.resize(
          props.fileBuffer,
          config.width,
          config.height,
          config.quality
        );
        throwIfAborted(props.signal);

        await this.storage.upload(variantKey, resizedBuffer, 'image/webp');
        throwIfAborted(props.signal);

        const variantMeta = await this.imageProcessor.extractMetadata(resizedBuffer);

        variantsToSave.push({
          variantType: config.type,
          storageKey: variantKey,
          width: variantMeta.width ?? null,
          height: variantMeta.height ?? null,
          fileSize: variantSize,
        });
      }

      // 6. DB Finalization
      const masterMeta = await this.imageProcessor.extractMetadata(masterBuffer);
      throwIfAborted(props.signal);
      const dbMetadata = {
        width: masterMeta.width ?? null,
        height: masterMeta.height ?? null,
        mimeType: 'image/webp',
        fileSize: masterBuffer.length,
        processedAt: new Date().toISOString(),
      };

      await this.mediaRepo.finalizeProcessedMedia({
        mediaId: id,
        metadata: dbMetadata,
        variants: variantsToSave,
      });

      isFinalized = true;
    } catch (err: unknown) {
      if (!isFinalized) {
        try {
          await this.mediaRepo.transitionToFailed(id);
        } catch (failedErr) {
          logger.error(
            { errorClass: getSafeErrorClass(failedErr), mediaId: id },
            'Failed to mark media as FAILED on ingestion error'
          );
        }

        for (const key of uploadedKeys) {
          try {
            await this.storage.delete(key);
          } catch (cleanupErr) {
            logger.error(
              { errorClass: getSafeErrorClass(cleanupErr), mediaId: id, stage: 'compensation' },
              'Failed to delete orphaned Cloudinary asset during compensation'
            );
          }
        }
      }

      if (
        err instanceof FileTooLargeError ||
        err instanceof MediaValidationError ||
        err instanceof UnsupportedMediaTypeError
      ) {
        throw new ValidationError(err.message);
      }

      logger.error(
        { errorClass: getSafeErrorClass(err), mediaId: id },
        'Media processing/upload phase failed internally'
      );
      throw new StorageUploadError('Failed to process and store media file');
    }

    let readyMedia: Media | null = null;
    try {
      readyMedia = await this.mediaRepo.findById(id);
    } catch (readErr) {
      logger.error(
        { errorClass: getSafeErrorClass(readErr), mediaId: id },
        'Failed to read media record after finalization'
      );
      throw new StorageUploadError('Failed to process and store media file');
    }

    if (!readyMedia) {
      throw new NotFoundError('Ingested media not found after finalization');
    }
    return { media: readyMedia, deduplicated: false };
  }
}
