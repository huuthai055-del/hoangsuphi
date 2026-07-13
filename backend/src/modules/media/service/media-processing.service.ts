import type { IMediaRepository } from '../repository/media-repository.interface';
import type { IMediaStorage } from '../domain/storage.interface';
import type { IImageProcessor } from '../domain/image-processor.interface';
import { runInTransaction } from '@/lib/database/client';
import {
  ImageProcessingError,
  StorageProcessingError,
  VariantGenerationError,
  MediaDomainError,
} from '../domain/media-errors';

export class MediaProcessingService {
  constructor(
    private readonly mediaRepo: IMediaRepository,
    private readonly storage: IMediaStorage,
    private readonly imageProcessor: IImageProcessor
  ) {}

  public async process(mediaId: string): Promise<void> {
    const media = await this.mediaRepo.findById(mediaId);
    if (!media) {
      throw new ImageProcessingError(`Media not found with ID: ${mediaId}`);
    }

    // Guard transition rules: UPLOADING/PROCESSING to PROCESSING, block READY to PROCESSING
    media.markProcessing();
    await this.mediaRepo.update(media);

    // Verify storage source file existence
    const exists = await this.storage.exists(media.storageKey);
    if (!exists) {
      media.markFailed();
      await this.mediaRepo.update(media);
      throw new StorageProcessingError(`Source storage key file not found: ${media.storageKey}`);
    }

    const uploadedVariantKeys: string[] = [];

    try {
      // 1. Download original file buffer
      const originalBuffer = await this.storage.download(media.storageKey);

      // 2. Extract EXIF / GPS / Dimensions metadata
      const metadata = await this.imageProcessor.extractMetadata(originalBuffer);

      // Structuring metadata
      const dbMetadata: Record<string, unknown> = {
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        cameraMake: metadata.cameraMake ?? null,
        cameraModel: metadata.cameraModel ?? null,
        orientation: metadata.orientation ?? null,
        gps: metadata.gps
          ? {
              latitude: metadata.gps.latitude,
              longitude: metadata.gps.longitude,
            }
          : null,
        processedAt: new Date().toISOString(),
      };

      // 3. Generate image variants (only for images)
      const variantsToSave: Array<{
        variantType: string;
        storageKey: string;
        width: number;
        height: number;
        fileSize: number;
      }> = [];

      if (media.mediaType === 'IMAGE') {
        const variantsConfig = [
          { type: 'thumbnail', width: 150, height: 150 },
          { type: 'medium', width: 600, height: 400 },
          { type: 'large', width: 1200, height: 800 },
        ];

        // Format dates based on the media entity metadata date rather than formatting paths
        const mediaProps = media.toPersistence();
        const year = mediaProps.createdAt.getFullYear();
        const month = String(mediaProps.createdAt.getMonth() + 1).padStart(2, '0');

        for (const config of variantsConfig) {
          const { buffer: resizedBuffer, fileSize } = await this.imageProcessor.resize(
            originalBuffer,
            config.width,
            config.height,
            80 // WebP compression quality
          );

          const variantKey = `uploads/${year}/${month}/${media.id}-${config.type}.webp`;

          // Upload variant file to storage
          await this.storage.upload(variantKey, resizedBuffer, 'image/webp');
          uploadedVariantKeys.push(variantKey);

          variantsToSave.push({
            variantType: config.type,
            storageKey: variantKey,
            width: config.width,
            height: config.height,
            fileSize,
          });
        }
      }

      // 4. Save metadata, variants and update media status inside a single DB transaction block
      await runInTransaction(async (tx) => {
        await this.mediaRepo.saveMetadata(media.id, dbMetadata, tx);

        for (const variantProps of variantsToSave) {
          await this.mediaRepo.saveVariant(
            {
              mediaId: media.id,
              ...variantProps,
            },
            tx
          );
        }

        media.markReady();
        await this.mediaRepo.update(media, tx);
      });
    } catch (err) {
      // Transition lifecycle status to FAILED on processing crash
      try {
        media.markFailed();
        await this.mediaRepo.update(media);
      } catch {
        // Suppress nested DB status update failures
      }

      // Cleanup generated variant files safely using settled promises
      await Promise.allSettled(uploadedVariantKeys.map((variantKey) => this.storage.delete(variantKey)));

      // Rethrow domain errors directly
      if (err instanceof MediaDomainError) {
        throw err;
      }

      throw new VariantGenerationError(
        `Failed to execute processing pipeline: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
