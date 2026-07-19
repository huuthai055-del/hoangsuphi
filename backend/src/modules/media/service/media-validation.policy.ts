import { MEDIA_CONFIG } from '../config/media.config';
import {
  FileTooLargeError,
  MediaValidationError,
  UnsupportedMediaTypeError,
} from '../domain/media-errors';
import type { MediaType } from '../domain/media.entity';

export const MediaValidationPolicy = {
  validateFileName(fileName: string): string {
    const trimmed = (fileName || '').trim();
    if (!trimmed) {
      throw new MediaValidationError('File name is required');
    }

    // Path traversal block
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new MediaValidationError('Invalid characters or path traversal detected in file name');
    }

    // Sanitize filename: keep alphanumeric, dots, dashes, underscores
    const sanitized = trimmed.replace(/[^a-zA-Z0-9.\-_]/g, '');
    if (!sanitized) {
      throw new MediaValidationError('File name consists of invalid characters only');
    }
    if (sanitized.length > 255) {
      throw new MediaValidationError('File name must not exceed 255 characters');
    }

    return sanitized;
  },

  determineMediaTypeAndLimit(
    mimeType: string,
    fileSize: number
  ): { mediaType: MediaType; limit: number } {
    const cleanMime = (mimeType || '').trim().toLowerCase();
    if (!cleanMime) {
      throw new UnsupportedMediaTypeError('MIME type is required');
    }

    if (MEDIA_CONFIG.allowedMimeTypes.IMAGE.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxImageSize) {
        throw new FileTooLargeError(
          `Image exceeds maximum allowed size of ${MEDIA_CONFIG.maxImageSize / (1024 * 1024)}MB`
        );
      }
      return { mediaType: 'IMAGE', limit: MEDIA_CONFIG.maxImageSize };
    }

    if (MEDIA_CONFIG.allowedMimeTypes.VIDEO.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxVideoSize) {
        throw new FileTooLargeError(
          `Video exceeds maximum allowed size of ${MEDIA_CONFIG.maxVideoSize / (1024 * 1024)}MB`
        );
      }
      return { mediaType: 'VIDEO', limit: MEDIA_CONFIG.maxVideoSize };
    }

    if (MEDIA_CONFIG.allowedMimeTypes.DOCUMENT.includes(cleanMime)) {
      if (fileSize > MEDIA_CONFIG.maxDocumentSize) {
        throw new FileTooLargeError(
          `Document exceeds maximum allowed size of ${MEDIA_CONFIG.maxDocumentSize / (1024 * 1024)}MB`
        );
      }
      return { mediaType: 'DOCUMENT', limit: MEDIA_CONFIG.maxDocumentSize };
    }

    throw new UnsupportedMediaTypeError(`Unsupported file MIME type: ${mimeType}`);
  },

  validateImageMagicBytes(buffer: Buffer, claimedMime: string): void {
    if (!buffer || buffer.length === 0) {
      throw new MediaValidationError('Empty buffer');
    }
    const cleanMime = (claimedMime || '').trim().toLowerCase();

    // Detect actual format from magic bytes
    let detectedFormat: 'jpeg' | 'png' | 'webp' | null = null;

    // JPEG check: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      detectedFormat = 'jpeg';
    }
    // PNG check: 89 50 4E 47 0D 0A 1A 0A
    else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      detectedFormat = 'png';
    }
    // WebP check: RIFF at 0..3, WEBP at 8..11
    else if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('binary') === 'RIFF' &&
      buffer.subarray(8, 12).toString('binary') === 'WEBP'
    ) {
      detectedFormat = 'webp';
    }

    if (detectedFormat) {
      const expectedMimes: Record<string, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      if (cleanMime !== expectedMimes[detectedFormat]) {
        throw new UnsupportedMediaTypeError(
          `MIME type mismatch: claimed ${claimedMime} but file header signature is ${detectedFormat.toUpperCase()}`
        );
      }
      return;
    }

    if (buffer.length < 12) {
      throw new MediaValidationError('File buffer is too short to be a valid image');
    }

    if (['image/jpeg', 'image/png', 'image/webp'].includes(cleanMime)) {
      throw new MediaValidationError(
        `Invalid image format: file does not match ${cleanMime} signature`
      );
    }

    throw new UnsupportedMediaTypeError(
      `Unsupported file header signature or MIME type: ${claimedMime}`
    );
  },
};
