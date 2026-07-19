import { logger } from '@/lib/logger';
import { v2 as cloudinary } from 'cloudinary';
import { StorageUploadError } from '../domain/media-errors';
import type { IMediaStorage } from '../domain/storage.interface';

function getSafeProviderErrorInfo(error: unknown): {
  errorClass: string;
  httpCode?: number;
  providerReason?: string;
} {
  if (!error || typeof error !== 'object') {
    return { errorClass: typeof error };
  }

  const nestedError =
    'error' in error && error.error && typeof error.error === 'object' ? error.error : undefined;
  const httpCode =
    'http_code' in error && typeof error.http_code === 'number'
      ? error.http_code
      : nestedError && 'http_code' in nestedError && typeof nestedError.http_code === 'number'
        ? nestedError.http_code
        : undefined;
  const providerMessage =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : nestedError && 'message' in nestedError && typeof nestedError.message === 'string'
        ? nestedError.message
        : undefined;
  const normalizedMessage = providerMessage?.toLowerCase();
  const providerReason = normalizedMessage?.includes('invalid signature')
    ? 'invalid-signature'
    : normalizedMessage?.includes('unknown api key') ||
        normalizedMessage?.includes('invalid api key')
      ? 'api-key-rejected'
      : normalizedMessage?.includes('invalid credentials')
        ? 'invalid-credentials'
        : normalizedMessage?.includes('authorization required')
          ? 'authorization-required'
          : normalizedMessage?.includes('not allowed') ||
              normalizedMessage?.includes('not authorized') ||
              normalizedMessage?.includes('permission') ||
              normalizedMessage?.includes('not permitted')
            ? 'forbidden'
            : normalizedMessage?.includes('invalidate')
              ? 'invalidation-not-enabled'
              : normalizedMessage?.includes('rate limit')
                ? 'rate-limited'
                : normalizedMessage?.includes('timestamp')
                  ? 'timestamp-rejected'
                  : undefined;

  return {
    errorClass: error instanceof Error ? error.name : 'CloudinaryProviderError',
    ...(httpCode === undefined ? {} : { httpCode }),
    ...(providerReason === undefined ? {} : { providerReason }),
  };
}

export class CloudinaryStorageAdapter implements IMediaStorage {
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly operationTimeoutMs: number;

  constructor(config?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    operationTimeoutMs?: number;
  }) {
    this.cloudName = config?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = config?.apiKey ?? process.env.CLOUDINARY_API_KEY;
    this.apiSecret = config?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;
    this.operationTimeoutMs = config?.operationTimeoutMs ?? 30_000;

    if (!Number.isFinite(this.operationTimeoutMs) || this.operationTimeoutMs <= 0) {
      throw new StorageUploadError('Cloudinary operation timeout must be a positive number');
    }

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true,
      });
    }
  }

  private validateConfig(): void {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new StorageUploadError('Cloudinary storage configuration is missing or incomplete');
    }
  }

  private validateKey(key: string): void {
    if (!key) {
      throw new StorageUploadError('Logical storage key cannot be empty');
    }
    // Reject path traversal, backslashes, leading slash, or URL schemes
    if (
      key.includes('..') ||
      key.includes('\\') ||
      key.startsWith('/') ||
      /^[a-zA-Z]+:\/\//.test(key)
    ) {
      throw new StorageUploadError('Logical storage key format is invalid');
    }
    // Reject characters other than alphanumeric, /, _, -, .
    if (!/^[a-zA-Z0-9_/.-]+$/.test(key)) {
      throw new StorageUploadError('Logical storage key contains unsafe characters');
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Cloudinary operation timed out')),
        this.operationTimeoutMs
      );
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  public async upload(key: string, fileBuffer: Buffer, _mimeType: string): Promise<void> {
    this.validateConfig();
    this.validateKey(key);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: key,
          resource_type: 'image',
          overwrite: false,
          timeout: this.operationTimeoutMs,
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          if (error) {
            logger.error(
              {
                provider: 'cloudinary',
                operation: 'upload',
                ...getSafeProviderErrorInfo(error),
              },
              'Cloudinary storage operation failed'
            );
            return reject(new StorageUploadError('Failed to upload file to Cloudinary storage'));
          }
          resolve();
        }
      );

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        uploadStream.destroy();
        logger.error(
          { provider: 'cloudinary', operation: 'upload', errorClass: 'OperationTimeout' },
          'Cloudinary storage operation failed'
        );
        reject(new StorageUploadError('Failed to upload file to Cloudinary storage'));
      }, this.operationTimeoutMs);

      uploadStream.end(fileBuffer);
    });
  }

  public async download(key: string): Promise<Buffer> {
    this.validateConfig();
    this.validateKey(key);
    const url = await this.getUrl(key);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Non-2xx response status: ${response.status}`);
      }

      // 1. Fast fail check on Content-Length header
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = Number.parseInt(contentLengthHeader, 10);
        if (!Number.isNaN(contentLength) && contentLength > 50 * 1024 * 1024) {
          throw new Error('Downloaded file exceeds maximum size limit');
        }
      }

      // 2. Stream-based download size protection
      const bodyStream = response.body;
      if (!bodyStream) {
        throw new Error('Response body is null');
      }

      const reader = bodyStream.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          totalBytes += value.length;
          if (totalBytes > 50 * 1024 * 1024) {
            controller.abort();
            throw new Error('Downloaded file exceeds maximum size limit');
          }
          chunks.push(value);
        }
      }

      clearTimeout(timeoutId);
      return Buffer.concat(chunks);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.message.includes('exceeds maximum size limit')) {
        throw new StorageUploadError(err.message);
      }
      throw new StorageUploadError('Failed to download file from Cloudinary storage');
    }
  }

  public async delete(key: string): Promise<void> {
    this.validateConfig();
    this.validateKey(key);

    try {
      const result = await this.withTimeout(
        cloudinary.uploader.destroy(key, {
          resource_type: 'image',
        })
      );

      const providerResult = typeof result.result === 'string' ? result.result : undefined;
      const normalizedResult = providerResult?.trim().toLowerCase().replaceAll('_', ' ');

      // Cloudinary destroy returns { result: 'ok' } or { result: 'not found' }
      if (normalizedResult !== 'ok' && normalizedResult !== 'not found') {
        throw new Error('Cloudinary destroy returned an unexpected result');
      }
    } catch (error: unknown) {
      const safeErrorInfo = getSafeProviderErrorInfo(error);

      logger.error(
        {
          provider: 'cloudinary',
          operation: 'delete',
          ...safeErrorInfo,
        },
        'Cloudinary storage operation failed'
      );
      throw new StorageUploadError('Failed to delete file from Cloudinary storage');
    }
  }

  public async exists(key: string): Promise<boolean> {
    this.validateConfig();
    this.validateKey(key);

    try {
      await this.withTimeout(
        cloudinary.api.resource(key, {
          resource_type: 'image',
          timeout: this.operationTimeoutMs,
        })
      );
      return true;
    } catch (err: unknown) {
      const safeErrorInfo = getSafeProviderErrorInfo(err);
      if (safeErrorInfo.httpCode === 404) {
        return false;
      }

      logger.error(
        {
          provider: 'cloudinary',
          operation: 'exists',
          ...safeErrorInfo,
        },
        'Cloudinary storage operation failed'
      );
      throw new StorageUploadError('Failed to verify file existence in Cloudinary storage');
    }
  }

  public async getUrl(key: string): Promise<string> {
    this.validateConfig();
    this.validateKey(key);
    const secureUrl = cloudinary.url(key, { secure: true, format: 'webp' });
    return secureUrl;
  }
}
