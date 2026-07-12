import { createHash } from 'node:crypto';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { IMediaStorage } from '../domain/storage.interface';
import { Media, type MediaType } from '../domain/media.entity';
import { MEDIA_CONFIG } from '../config/media.config';
import { generateUuidV7 } from '@/common/utils/uuid';
import {
  MediaValidationError,
  UnsupportedMediaTypeError,
  FileTooLargeError,
  StorageUploadError,
} from '../domain/media-errors';

export class MediaUploadService {
  constructor(
    private readonly mediaRepo: IMediaRepository,
    private readonly storage: IMediaStorage
  ) {}

  private validateFileName(fileName: string): string {
    const trimmed = (fileName || '').trim();
    if (!trimmed) {
      throw new MediaValidationError('File name is required');
    }

    // Path traversal block
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new MediaValidationError('Invalid characters or path traversal detected in file name');
    }

    // Sanitize filename: keep alphanumeric, dots, dashes, underscores
    const sanitized = trimmed.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (!sanitized) {
      throw new MediaValidationError('File name consists of invalid characters only');
    }

    return sanitized;
  }

  private determineMediaTypeAndLimit(mimeType: string, fileSize: number): { mediaType: MediaType; limit: number } {
    const cleanMime = (mimeType || '').trim().toLowerCase();
    if (!cleanMime) {
      throw new UnsupportedMediaTypeError('MIME type is required');
    }

    if (MEDIA_CONFIG.allowedMimeTypes.IMAGE.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxImageSize) {
        throw new FileTooLargeError(`Image exceeds maximum allowed size of ${MEDIA_CONFIG.maxImageSize / (1024 * 1024)}MB`);
      }
      return { mediaType: 'IMAGE', limit: MEDIA_CONFIG.maxImageSize };
    }

    if (MEDIA_CONFIG.allowedMimeTypes.VIDEO.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxVideoSize) {
        throw new FileTooLargeError(`Video exceeds maximum allowed size of ${MEDIA_CONFIG.maxVideoSize / (1024 * 1024)}MB`);
      }
      return { mediaType: 'VIDEO', limit: MEDIA_CONFIG.maxVideoSize };
    }

    if (MEDIA_CONFIG.allowedMimeTypes.DOCUMENT.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxDocumentSize) {
        throw new FileTooLargeError(`Document exceeds maximum allowed size of ${MEDIA_CONFIG.maxDocumentSize / (1024 * 1024)}MB`);
      }
      return { mediaType: 'DOCUMENT', limit: MEDIA_CONFIG.maxDocumentSize };
    }

    throw new UnsupportedMediaTypeError(`Unsupported file MIME type: ${mimeType}`);
  }

  public async upload(props: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    ownerType?: string | null;
    ownerId?: string | null;
  }): Promise<Media> {
    const sanitizedName = this.validateFileName(props.fileName);
    const fileSize = props.fileBuffer.length;
    const { mediaType } = this.determineMediaTypeAndLimit(props.mimeType, fileSize);

    // Calculate SHA-256 hash for deduplication
    const hash = createHash('sha256').update(props.fileBuffer).digest('hex');

    // Duplicate detection check
    const existingMedia = await this.mediaRepo.findByHash(hash);
    if (existingMedia && existingMedia.status === 'READY') {
      return existingMedia;
    }

    // Generate unique identity & storage key
    const id = generateUuidV7();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const storageKey = `uploads/${year}/${month}/${id}-${sanitizedName}`;

    // 1. Storage Upload
    try {
      await this.storage.upload(storageKey, props.fileBuffer, props.mimeType);
    } catch (err) {
      throw new StorageUploadError(`Failed to store uploaded file: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Database Save
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
      now,
    });

    try {
      await this.mediaRepo.save(media);
    } catch (dbErr) {
      // Transaction Safety Rollback: Cleanup uploaded storage file if DB save fails
      await this.storage.delete(storageKey);
      throw dbErr;
    }

    // 3. Mark Ready
    try {
      media.markReady();
      await this.mediaRepo.update(media);
    } catch (updateErr) {
      // Cleanup both storage file and db record if confirmation fails
      await this.storage.delete(storageKey);
      try {
        await this.mediaRepo.delete(media.id);
      } catch {
        // Suppress nested DB cleanup errors to preserve original exception context
      }
      throw updateErr;
    }

    return media;
  }
}
