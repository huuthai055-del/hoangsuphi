import { MEDIA_CONFIG } from '../config/media.config';
import { MediaValidationError, UnsupportedMediaTypeError, FileTooLargeError } from '../domain/media-errors';
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

    return sanitized;
  },

  determineMediaTypeAndLimit(mimeType: string, fileSize: number): { mediaType: MediaType; limit: number } {
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
};
