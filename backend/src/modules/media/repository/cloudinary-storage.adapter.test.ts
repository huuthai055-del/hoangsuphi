import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { logger } from '@/lib/logger';
import { StorageUploadError } from '../domain/media-errors';
import { MediaProcessingService } from '../service/media-processing.service';
import { MediaUploadService } from '../service/media-upload.service';
import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';

// Mock variables to control SDK behavior
let mockUploadStreamError: any = null;
let mockUploadStreamResult: any = { public_id: 'mock-key' };
let mockUploadOptions: any[] = [];
let mockUploadShouldHang = false;
let mockUploadStreamDestroyed = false;
let mockDestroyResult: any = { result: 'ok' };
let mockDestroyError: any = null;
let mockDestroyCalls: Array<{ key: string; options: any }> = [];
let mockResourceResult: any = {};
let mockResourceError: any = null;

// Mock Cloudinary SDK
mock.module('cloudinary', () => {
  return {
    v2: {
      config: () => {},
      uploader: {
        upload_stream: (options: any, callback: any) => {
          mockUploadOptions.push(options);
          // Verify options
          if (options.overwrite === true) {
            throw new Error('Overwrite should not be set to true');
          }
          const stream = {
            end: (_buffer: Buffer) => {
              if (mockUploadShouldHang) return;
              if (mockUploadStreamError) {
                callback(mockUploadStreamError, null);
              } else {
                callback(null, mockUploadStreamResult);
              }
            },
            destroy: () => {
              mockUploadStreamDestroyed = true;
            },
          };
          return stream;
        },
        destroy: async (key: string, options: any) => {
          mockDestroyCalls.push({ key, options });
          if (mockDestroyError) {
            throw mockDestroyError;
          }
          return mockDestroyResult;
        },
      },
      api: {
        resource: async (_key: string, _options: any) => {
          if (mockResourceError) {
            throw mockResourceError;
          }
          return mockResourceResult;
        },
      },
      url: (key: string, _options: any) => {
        return `https://res.cloudinary.com/mock-cloud/image/upload/${key}`;
      },
    },
  };
});

describe('CloudinaryStorageAdapter Unit Tests', () => {
  let adapter: CloudinaryStorageAdapter;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
    process.env.CLOUDINARY_API_KEY = 'test_key';
    process.env.CLOUDINARY_API_SECRET = 'test_secret';

    mockUploadStreamError = null;
    mockUploadStreamResult = { public_id: 'mock-key' };
    mockUploadOptions = [];
    mockUploadShouldHang = false;
    mockUploadStreamDestroyed = false;
    mockDestroyResult = { result: 'ok' };
    mockDestroyError = null;
    mockDestroyCalls = [];
    mockResourceResult = {};
    mockResourceError = null;

    adapter = new CloudinaryStorageAdapter();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Configuration Validation', () => {
    test('should throw StorageUploadError if configuration is missing', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = '';
      const badAdapter = new CloudinaryStorageAdapter();
      await expect(badAdapter.upload('key', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });
  });

  describe('Key Validation', () => {
    test('should reject empty or null key', async () => {
      await expect(adapter.upload('', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });

    test('should reject path traversal key containing ..', async () => {
      await expect(adapter.upload('some/../path', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });

    test('should reject backslashes', async () => {
      await expect(adapter.upload('some\\path', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });

    test('should reject leading slash', async () => {
      await expect(adapter.upload('/some/path', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });

    test('should reject URL schemes', async () => {
      await expect(
        adapter.upload('http://some/path', Buffer.alloc(10), 'image/png')
      ).rejects.toThrow(StorageUploadError);
      await expect(
        adapter.upload('https://some/path', Buffer.alloc(10), 'image/png')
      ).rejects.toThrow(StorageUploadError);
    });

    test('should reject unsafe characters', async () => {
      await expect(adapter.upload('some#path', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
      await expect(adapter.upload('some?path', Buffer.alloc(10), 'image/png')).rejects.toThrow(
        StorageUploadError
      );
    });

    test('should allow legacy key containing slashes, dots, dashes, underscores', async () => {
      mockUploadStreamError = null;
      await expect(
        adapter.upload('legacy/path-to_file.webp', Buffer.alloc(10), 'image/webp')
      ).resolves.toBeUndefined();
    });
  });

  describe('Upload operation', () => {
    test('should upload successfully and pass secure parameters', async () => {
      await expect(
        adapter.upload('secure-key', Buffer.from('test-data'), 'image/jpeg')
      ).resolves.toBeUndefined();
      expect(mockUploadOptions).toEqual([
        {
          public_id: 'secure-key',
          resource_type: 'image',
          overwrite: false,
          timeout: 30_000,
        },
      ]);
    });

    test('should terminate and destroy an upload stream that exceeds the configured timeout', async () => {
      mockUploadShouldHang = true;
      const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
      const timeoutAdapter = new CloudinaryStorageAdapter({
        cloudName: 'test_cloud',
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        operationTimeoutMs: 5,
      });

      try {
        await expect(
          timeoutAdapter.upload('timeout-key', Buffer.from('data'), 'image/webp')
        ).rejects.toThrow(StorageUploadError);
        expect(mockUploadStreamDestroyed).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });

    test('should map provider error to StorageUploadError without leaking raw info', async () => {
      const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
      mockUploadStreamError = {
        http_code: 401,
        message: 'Invalid credentials: CLOUDINARY_UPLOAD_SECRET_SENTINEL',
      };

      try {
        await expect(adapter.upload('key', Buffer.from('data'), 'image/jpeg')).rejects.toThrow(
          StorageUploadError
        );

        const serializedLogs = JSON.stringify(logSpy.mock.calls);
        expect(serializedLogs).toContain('401');
        expect(serializedLogs).toContain('invalid-credentials');
        expect(serializedLogs).not.toContain('CLOUDINARY_UPLOAD_SECRET_SENTINEL');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('getUrl operation', () => {
    test('should generate secure HTTPS url using key', async () => {
      const url = await adapter.getUrl('test-key');
      expect(url).toBe('https://res.cloudinary.com/mock-cloud/image/upload/test-key');
    });
  });

  describe('exists operation', () => {
    test('should return true if asset exists', async () => {
      mockResourceResult = { public_id: 'test-key' };
      const exists = await adapter.exists('test-key');
      expect(exists).toBe(true);
    });

    test('should return false if asset is not found (404)', async () => {
      mockResourceError = { http_code: 404, message: 'Resource not found' };
      const exists = await adapter.exists('test-key');
      expect(exists).toBe(false);
    });

    test('should return false for the nested 404 shape returned by the Admin API SDK', async () => {
      mockResourceError = {
        error: { http_code: 404, message: 'Resource not found' },
        query_params: 'provider-internal-value',
      };
      const exists = await adapter.exists('test-key');
      expect(exists).toBe(false);
    });

    test('should throw StorageUploadError for non-404 provider error', async () => {
      const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
      mockResourceError = {
        error: { http_code: 403, message: 'Unauthorized: EXISTS_SECRET_SENTINEL' },
        query_params: 'api_secret=QUERY_SECRET_SENTINEL',
      };

      try {
        await expect(adapter.exists('test-key')).rejects.toThrow(StorageUploadError);

        const serializedLogs = JSON.stringify(logSpy.mock.calls);
        expect(serializedLogs).toContain('403');
        expect(serializedLogs).not.toContain('EXISTS_SECRET_SENTINEL');
        expect(serializedLogs).not.toContain('QUERY_SECRET_SENTINEL');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('delete operation', () => {
    test('should delete asset successfully', async () => {
      mockDestroyResult = { result: 'ok' };
      await expect(adapter.delete('test-key')).resolves.toBeUndefined();
      expect(mockDestroyCalls).toEqual([
        {
          key: 'test-key',
          options: { resource_type: 'image' },
        },
      ]);
    });

    test('should be idempotent and not throw if asset not found', async () => {
      mockDestroyResult = { result: 'not found' };
      await expect(adapter.delete('test-key')).resolves.toBeUndefined();
    });

    test('should accept the underscore not_found provider variant idempotently', async () => {
      mockDestroyResult = { result: 'not_found' };
      await expect(adapter.delete('test-key')).resolves.toBeUndefined();
    });

    test('should throw StorageUploadError if destroy returns unexpected result', async () => {
      mockDestroyResult = { result: 'server-error' };
      await expect(adapter.delete('test-key')).rejects.toThrow(StorageUploadError);
    });

    test('should throw StorageUploadError if destroy fails', async () => {
      mockDestroyError = new Error('Destroy API failure');
      await expect(adapter.delete('test-key')).rejects.toThrow(StorageUploadError);
    });

    test('should log only safe diagnostics when destroy fails', async () => {
      const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
      mockDestroyError = {
        http_code: 403,
        message: 'Invalid API secret: CLOUDINARY_SECRET_SENTINEL',
      };

      try {
        await expect(adapter.delete('test-key')).rejects.toThrow(StorageUploadError);

        const serializedLogs = JSON.stringify(logSpy.mock.calls);
        expect(serializedLogs).toContain('403');
        expect(serializedLogs).toContain('delete');
        expect(serializedLogs).not.toContain('CLOUDINARY_SECRET_SENTINEL');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('download operation', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test('should download asset successfully and return buffer', async () => {
      globalThis.fetch = mock(() => {
        return Promise.resolve(new Response(Buffer.from('downloaded-data')));
      }) as any;

      const buffer = await adapter.download('test-key');
      expect(buffer.toString()).toBe('downloaded-data');
    });

    test('should throw StorageUploadError if non-2xx status is returned', async () => {
      globalThis.fetch = mock(() => {
        return Promise.resolve(new Response(null, { status: 404 }));
      }) as any;

      await expect(adapter.download('test-key')).rejects.toThrow(StorageUploadError);
    });

    test('should throw StorageUploadError if file exceeds size limit', async () => {
      const hugeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      globalThis.fetch = mock(() => {
        return Promise.resolve(new Response(hugeBuffer));
      }) as any;

      await expect(adapter.download('test-key')).rejects.toThrow(StorageUploadError);
    });

    test('should reject stream download if content-length header exceeds 50MB before download', async () => {
      globalThis.fetch = mock(() => {
        const headers = new Headers();
        headers.set('content-length', String(60 * 1024 * 1024)); // 60MB
        return Promise.resolve(new Response(null, { headers }));
      }) as any;

      await expect(adapter.download('test-key')).rejects.toThrow(
        'Downloaded file exceeds maximum size limit'
      );
    });

    test('should abort stream download midway if bytes exceed 50MB limit', async () => {
      let chunkCount = 0;
      const mockStream = new ReadableStream({
        async pull(controller) {
          chunkCount++;
          if (chunkCount > 2) {
            controller.close();
            return;
          }
          controller.enqueue(new Uint8Array(30 * 1024 * 1024)); // 30MB chunk
        },
      });

      globalThis.fetch = mock(() => {
        return Promise.resolve(new Response(mockStream));
      }) as any;

      await expect(adapter.download('test-key')).rejects.toThrow(
        'Downloaded file exceeds maximum size limit'
      );
    });
  });

  describe('Compensation & Cleanups via IMediaStorage', () => {
    test('MediaUploadService cleanup is triggered on DB save failure with exact key', async () => {
      // Mock MediaRepository to throw error on save
      const mockMediaRepo: any = {
        findByHash: mock(() => Promise.resolve(null)),
        save: mock(() => {
          throw new Error('Database insertion failed');
        }),
      };

      // Spy on upload to capture the generated key, and spy on delete
      let uploadedKey = '';
      const uploadSpy = mock((key: string, _buffer: Buffer, _mime: string) => {
        uploadedKey = key;
        return Promise.resolve();
      });
      const deleteSpy = mock(() => Promise.resolve());
      const mockStorage: any = {
        upload: uploadSpy,
        delete: deleteSpy,
        getUrl: mock(() => Promise.resolve('https://cloudinary/key')),
      };

      const uploadService = new MediaUploadService(mockMediaRepo, mockStorage);

      const mockBuffer = Buffer.from('fake-image');
      await expect(
        uploadService.upload({
          fileName: 'test.png',
          mimeType: 'image/png',
          fileBuffer: mockBuffer,
          uploadedBy: 'user-123',
        })
      ).rejects.toThrow('Database insertion failed');

      // Verify that delete was called to clean up the uploaded storage key with the exact uploaded key
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith(uploadedKey);
    });

    test('MediaUploadService cleanup fails should NOT obscure original DB error', async () => {
      const mockMediaRepo: any = {
        findByHash: mock(() => Promise.resolve(null)),
        save: mock(() => {
          throw new Error('Database insertion failed');
        }),
      };

      let uploadedKey = '';
      const uploadSpy = mock((key: string, _buffer: Buffer, _mime: string) => {
        uploadedKey = key;
        return Promise.resolve();
      });
      const deleteSpy = mock(() => {
        return Promise.reject(new Error('Storage deletion crash during upload cleanup'));
      });

      const mockStorage: any = {
        upload: uploadSpy,
        delete: deleteSpy,
        getUrl: mock(() => Promise.resolve('https://cloudinary/key')),
      };

      const uploadService = new MediaUploadService(mockMediaRepo, mockStorage);

      // Original database error must bubble up, NOT the cleanup error
      await expect(
        uploadService.upload({
          fileName: 'test.png',
          mimeType: 'image/png',
          fileBuffer: Buffer.from('fake-image'),
          uploadedBy: 'user-123',
        })
      ).rejects.toThrow('Database insertion failed');

      // Cleanup must still have targeted the exact uploaded key
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith(uploadedKey);
    });

    test('MediaProcessingService cleanup is triggered on processing crash with exact variant key', async () => {
      const mockMediaRepo: any = {
        findById: mock(() => {
          return {
            id: 'media-id',
            status: 'PROCESSING',
            mediaType: 'IMAGE',
            storageKey: 'uploads/key.png',
            markProcessing: () => {},
            markReady: () => {},
            markFailed: () => {},
            addVariant: () => {},
            setMetadata: () => {},
            toPersistence: () => {
              return {
                createdAt: new Date(),
              };
            },
          };
        }),
        update: mock(() => Promise.resolve()),
        save: mock(() => Promise.resolve()),
        saveMetadata: mock(() => Promise.resolve()),
        saveVariants: mock(() => Promise.resolve()),
        updateStatus: mock(() => Promise.resolve()),
      };

      // Mock ImageProcessor to throw error during resizing on the second call
      let resizeCount = 0;
      const mockImageProcessor: any = {
        extractMetadata: mock(() => {
          return Promise.resolve({
            width: 100,
            height: 100,
            gps: null,
            orientation: 1,
          });
        }),
        resize: mock(() => {
          resizeCount++;
          if (resizeCount > 1) {
            throw new Error('Sharp processing crash');
          }
          return Promise.resolve({
            buffer: Buffer.from('resized-thumbnail'),
            fileSize: 100,
          });
        }),
      };

      // Capture upload keys
      const uploadedVariantKeys: string[] = [];
      const uploadSpy = mock((key: string, _buffer: Buffer, _mime: string) => {
        uploadedVariantKeys.push(key);
        return Promise.resolve();
      });
      const deleteSpy = mock(() => Promise.resolve());
      const mockStorage: any = {
        exists: mock(() => Promise.resolve(true)),
        download: mock(() => Promise.resolve(Buffer.from('fake-image'))),
        upload: uploadSpy,
        delete: deleteSpy,
      };

      const processingService = new MediaProcessingService(
        mockMediaRepo,
        mockStorage,
        mockImageProcessor
      );

      await expect(processingService.process('media-id')).rejects.toThrow(
        'Failed to execute processing pipeline'
      );

      // Verify that delete was called to clean up exactly the uploaded variants
      expect(deleteSpy).toHaveBeenCalledTimes(uploadedVariantKeys.length);
      for (const variantKey of uploadedVariantKeys) {
        expect(deleteSpy).toHaveBeenCalledWith(variantKey);
      }
    });

    test('MediaProcessingService cleanup fails should NOT obscure original processing error', async () => {
      const mockMediaRepo: any = {
        findById: mock(() => {
          return {
            id: 'media-id',
            status: 'PROCESSING',
            mediaType: 'IMAGE',
            storageKey: 'uploads/key.png',
            markProcessing: () => {},
            markReady: () => {},
            markFailed: () => {},
            addVariant: () => {},
            setMetadata: () => {},
            toPersistence: () => {
              return {
                createdAt: new Date(),
              };
            },
          };
        }),
        update: mock(() => Promise.resolve()),
        save: mock(() => Promise.resolve()),
        saveMetadata: mock(() => Promise.resolve()),
        saveVariants: mock(() => Promise.resolve()),
        updateStatus: mock(() => Promise.resolve()),
      };

      let resizeCount = 0;
      const mockImageProcessor: any = {
        extractMetadata: mock(() => {
          return Promise.resolve({
            width: 100,
            height: 100,
            gps: null,
            orientation: 1,
          });
        }),
        resize: mock(() => {
          resizeCount++;
          if (resizeCount > 1) {
            throw new Error('Sharp processing crash');
          }
          return Promise.resolve({
            buffer: Buffer.from('resized-thumbnail'),
            fileSize: 100,
          });
        }),
      };

      const uploadedVariantKeys: string[] = [];
      const uploadSpy = mock((key: string, _buffer: Buffer, _mime: string) => {
        uploadedVariantKeys.push(key);
        return Promise.resolve();
      });
      const deleteSpy = mock(() => {
        return Promise.reject(new Error('Storage deletion crash during variant cleanup'));
      });

      const mockStorage: any = {
        exists: mock(() => Promise.resolve(true)),
        download: mock(() => Promise.resolve(Buffer.from('fake-image'))),
        upload: uploadSpy,
        delete: deleteSpy,
      };

      const processingService = new MediaProcessingService(
        mockMediaRepo,
        mockStorage,
        mockImageProcessor
      );

      // Original processing error must bubble up, NOT the cleanup error
      await expect(processingService.process('media-id')).rejects.toThrow(
        'Failed to execute processing pipeline'
      );

      // Cleanup must still have targeted exactly the uploaded variant keys
      expect(deleteSpy).toHaveBeenCalledTimes(uploadedVariantKeys.length);
      for (const variantKey of uploadedVariantKeys) {
        expect(deleteSpy).toHaveBeenCalledWith(variantKey);
      }
    });
  });
});
