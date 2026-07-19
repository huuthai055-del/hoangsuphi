import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { ConflictError } from '@/common/errors/http.errors';
import { logger } from '@/lib/logger';
import { StorageUploadError, UnsupportedMediaTypeError } from '../domain/media-errors';
import { Media } from '../domain/media.entity';
import { ScopedDuplicateConflictError } from '../repository/repository-errors';
import { MediaIngestionService } from './media-ingestion.service';

describe('MediaIngestionService', () => {
  let service: MediaIngestionService;

  const mockMediaRepo = {
    findById: mock(() => Promise.resolve<Media | null>(null)),
    findByHash: mock(() => Promise.resolve<Media | null>(null)),
    findScopedDuplicate: mock(() => Promise.resolve<Media | null>(null)),
    save: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    transitionToProcessing: mock(() => Promise.resolve()),
    transitionToFailed: mock(() => Promise.resolve()),
    finalizeProcessedMedia: mock(() => Promise.resolve()),
    saveMetadata: mock(() => Promise.resolve()),
    saveVariant: mock(() => Promise.resolve()),
    getMetadata: mock(() => Promise.resolve(null)),
    getVariants: mock(() => Promise.resolve<any[]>([])),
  };

  const mockStorage = {
    upload: mock((_key: string, _buf: Buffer, _mime: string) => Promise.resolve()),
    exists: mock((_key: string) => Promise.resolve(true)),
    download: mock((_key: string) => Promise.resolve(Buffer.from(''))),
    delete: mock((_key: string) => Promise.resolve()),
    getUrl: mock((_key: string) => Promise.resolve('')),
  };

  const mockImageProcessor = {
    extractMetadata: mock(() =>
      Promise.resolve({ width: 800, height: 600, gps: null, orientation: 1 })
    ),
    resize: mock(() => Promise.resolve({ buffer: Buffer.from('resized-bytes'), fileSize: 100 })),
  };

  beforeEach(() => {
    mockMediaRepo.findById.mockClear();
    mockMediaRepo.findByHash.mockClear();
    mockMediaRepo.findScopedDuplicate.mockClear();
    mockMediaRepo.save.mockClear();
    mockMediaRepo.update.mockClear();
    mockMediaRepo.transitionToProcessing.mockClear();
    mockMediaRepo.transitionToFailed.mockClear();
    mockMediaRepo.finalizeProcessedMedia.mockClear();

    mockMediaRepo.findById.mockImplementation(() => Promise.resolve(null));
    mockMediaRepo.save.mockImplementation(() => Promise.resolve());
    mockMediaRepo.finalizeProcessedMedia.mockImplementation(() => Promise.resolve());
    mockMediaRepo.transitionToFailed.mockImplementation(() => Promise.resolve());

    mockStorage.upload.mockClear();
    mockStorage.delete.mockClear();
    mockStorage.upload.mockImplementation(() => Promise.resolve());
    mockStorage.delete.mockImplementation(() => Promise.resolve());

    mockImageProcessor.extractMetadata.mockClear();
    mockImageProcessor.resize.mockClear();
    mockImageProcessor.resize.mockImplementation(() =>
      Promise.resolve({ buffer: Buffer.from('resized-bytes'), fileSize: 100 })
    );

    service = new MediaIngestionService(
      mockMediaRepo as any,
      mockStorage as any,
      mockImageProcessor as any
    );
  });

  const validJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const dummyUser = '00000000-0000-0000-0000-000000000001';

  test('should successfully ingest IMAGE, resizing master to 85, variants to 80, and finalise state READY', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));

    const uploaderMedia = Media.create({
      id: 'media-id',
      fileName: 'test.jpg',
      storageKey: 'hoangsuphi/test/media/media-id/master',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      fileSize: validJpgHeader.length,
      hash: 'hash-xyz',
    });
    uploaderMedia.markProcessing();
    uploaderMedia.markReady();
    mockMediaRepo.findById.mockImplementation(() => Promise.resolve(uploaderMedia));

    const result = await service.ingest({
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
      fileBuffer: validJpgHeader,
      altText: 'Alt text',
      caption: 'Caption text',
      uploadedBy: dummyUser,
    });

    expect(result.deduplicated).toBe(false);
    expect(result.media.status).toBe('READY');

    expect(mockMediaRepo.save).toHaveBeenCalled();
    expect(mockMediaRepo.transitionToProcessing).toHaveBeenCalled();

    // 1 master resize and 3 variants resize (thumbnail, medium, large)
    expect(mockImageProcessor.resize).toHaveBeenCalledTimes(4);
    expect(mockStorage.upload).toHaveBeenCalledTimes(4);
    expect(mockMediaRepo.finalizeProcessedMedia).toHaveBeenCalled();
    expect(mockMediaRepo.finalizeProcessedMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          mimeType: 'image/webp',
          fileSize: Buffer.byteLength('resized-bytes'),
        }),
      })
    );
  });

  test('should reject non-IMAGE types with UnsupportedMediaTypeError', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));

    const pdfBuffer = Buffer.from('PDF header dummy bytes');
    await expect(
      service.ingest({
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileBuffer: pdfBuffer,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(UnsupportedMediaTypeError);

    expect(mockMediaRepo.save).not.toHaveBeenCalled();
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  test('should return existing READY record if duplicate is found', async () => {
    const existing = Media.create({
      id: 'existing-id',
      fileName: 'test.jpg',
      storageKey: 'key',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      fileSize: validJpgHeader.length,
      hash: 'duplicate-hash',
    });
    existing.markProcessing();
    existing.markReady();
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(existing));

    const result = await service.ingest({
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
      fileBuffer: validJpgHeader,
      uploadedBy: dummyUser,
    });

    expect(result.deduplicated).toBe(true);
    expect(result.media.id).toBe('existing-id');
    expect(mockMediaRepo.save).not.toHaveBeenCalled();
  });

  test('should throw ConflictError if duplicate is currently UPLOADING or PROCESSING', async () => {
    const uploadingMedia = Media.create({
      id: 'existing-id',
      fileName: 'test.jpg',
      storageKey: 'key',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      fileSize: validJpgHeader.length,
      hash: 'duplicate-hash',
    });
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(uploadingMedia));

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(ConflictError);
  });

  test('should trigger compensation rollback on upload error and clean up all pre-registered keys', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));

    const attemptedUploadKeys: string[] = [];
    let uploadCount = 0;
    mockStorage.upload.mockImplementation((key) => {
      uploadCount++;
      attemptedUploadKeys.push(key);
      if (uploadCount === 3) {
        return Promise.reject(new Error('Cloudinary down'));
      }
      return Promise.resolve();
    });

    const attemptedDeleteKeys: string[] = [];
    mockStorage.delete.mockImplementation((key) => {
      attemptedDeleteKeys.push(key);
      return Promise.resolve();
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow();

    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalled();
    expect(attemptedUploadKeys).toHaveLength(3);
    expect(attemptedDeleteKeys).toEqual(attemptedUploadKeys);
  });

  test('should compensate uploaded assets when the client aborts before finalization', async () => {
    const abortController = new AbortController();
    mockStorage.upload.mockImplementation(async () => {
      abortController.abort();
    });

    await expect(
      service.ingest({
        fileName: 'aborted.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
        signal: abortController.signal,
      })
    ).rejects.toThrow(StorageUploadError);

    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalledTimes(1);
    expect(mockStorage.delete).toHaveBeenCalledTimes(1);
    expect(mockMediaRepo.finalizeProcessedMedia).not.toHaveBeenCalled();
  });

  test('should compensate the exact master key when master upload fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));

    const attemptedUploadKeys: string[] = [];
    mockStorage.upload.mockImplementation((key) => {
      attemptedUploadKeys.push(key);
      return Promise.reject(new Error('Master upload interrupted'));
    });

    const attemptedDeleteKeys: string[] = [];
    mockStorage.delete.mockImplementation((key) => {
      attemptedDeleteKeys.push(key);
      return Promise.resolve();
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(StorageUploadError);

    expect(attemptedUploadKeys).toHaveLength(1);
    expect(attemptedDeleteKeys).toEqual(attemptedUploadKeys);
    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalledTimes(1);
  });

  test('should compensate the exact master and thumbnail keys when thumbnail upload fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));

    const attemptedUploadKeys: string[] = [];
    mockStorage.upload.mockImplementation((key) => {
      attemptedUploadKeys.push(key);
      if (attemptedUploadKeys.length === 2) {
        return Promise.reject(new Error('Thumbnail upload interrupted'));
      }
      return Promise.resolve();
    });

    const attemptedDeleteKeys: string[] = [];
    mockStorage.delete.mockImplementation((key) => {
      attemptedDeleteKeys.push(key);
      return Promise.resolve();
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(StorageUploadError);

    expect(attemptedUploadKeys).toHaveLength(2);
    expect(attemptedDeleteKeys).toEqual(attemptedUploadKeys);
    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalledTimes(1);
  });

  test('should handle concurrent unique index violation from DB during save and throw ConflictError', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    mockMediaRepo.save.mockImplementation(() => {
      throw new ScopedDuplicateConflictError('DB constraint failed');
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(ConflictError);
  });

  test('should NOT execute compensation if DB finalization succeeds but post-finalize read fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    mockMediaRepo.finalizeProcessedMedia.mockImplementation(() => Promise.resolve());
    mockMediaRepo.findById.mockImplementation(() =>
      Promise.reject(new Error('Transient DB read error'))
    );

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(StorageUploadError);

    // Verify finalize succeeded, hence isFinalized is true
    // Verify transitionToFailed was NOT called
    expect(mockMediaRepo.transitionToFailed).not.toHaveBeenCalled();
    // Verify storage assets were NOT deleted
    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  test('should wrap raw system errors containing sensitive info into safe StorageUploadError', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
    mockMediaRepo.save.mockImplementation(() => {
      throw new Error('Database password is PASSWORD123');
    });

    try {
      await expect(
        service.ingest({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          fileBuffer: validJpgHeader,
          uploadedBy: dummyUser,
        })
      ).rejects.toThrow('Failed to process and store media file');

      const serializedLogs = JSON.stringify(logSpy.mock.calls);
      expect(serializedLogs).not.toContain('PASSWORD123');
      expect(serializedLogs).not.toContain('Database password');
      expect(serializedLogs).toContain('Error');
    } finally {
      logSpy.mockRestore();
    }
  });

  test('should trigger compensation and transition to FAILED when master image resize fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    mockImageProcessor.resize.mockImplementation(() => {
      throw new Error('Sharp out of memory');
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(StorageUploadError);

    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalled();
    expect(mockStorage.upload).not.toHaveBeenCalled();
    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  test('should trigger compensation and clean up all 4 uploaded keys when DB finalization fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    mockMediaRepo.finalizeProcessedMedia.mockImplementation(() => {
      throw new Error('DB connection reset');
    });

    const attemptedUploadKeys: string[] = [];
    mockStorage.upload.mockImplementation((key) => {
      attemptedUploadKeys.push(key);
      return Promise.resolve();
    });

    const attemptedDeleteKeys: string[] = [];
    mockStorage.delete.mockImplementation((key) => {
      attemptedDeleteKeys.push(key);
      return Promise.resolve();
    });

    await expect(
      service.ingest({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: validJpgHeader,
        uploadedBy: dummyUser,
      })
    ).rejects.toThrow(StorageUploadError);

    expect(mockMediaRepo.transitionToFailed).toHaveBeenCalled();
    expect(attemptedDeleteKeys).toHaveLength(4);
    expect(attemptedDeleteKeys).toEqual(attemptedUploadKeys);
  });

  test('should trigger compensation when final variant (large) upload fails and keep original error if delete fails', async () => {
    mockMediaRepo.findScopedDuplicate.mockImplementation(() => Promise.resolve(null));
    const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined);

    const attemptedUploadKeys: string[] = [];
    let uploadCount = 0;
    mockStorage.upload.mockImplementation((key) => {
      uploadCount++;
      attemptedUploadKeys.push(key);
      if (uploadCount === 4) {
        return Promise.reject(new Error('Cloudinary timeout'));
      }
      return Promise.resolve();
    });

    const attemptedDeleteKeys: string[] = [];
    mockStorage.delete.mockImplementation((key) => {
      attemptedDeleteKeys.push(key);
      throw new Error('Delete credentials invalid: CLOUDINARY_API_SECRET=LOG_SECRET');
    });

    try {
      await expect(
        service.ingest({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          fileBuffer: validJpgHeader,
          uploadedBy: dummyUser,
        })
      ).rejects.toThrow(StorageUploadError);

      expect(mockMediaRepo.transitionToFailed).toHaveBeenCalled();
      expect(attemptedDeleteKeys).toHaveLength(4);
      expect(attemptedDeleteKeys).toEqual(attemptedUploadKeys);
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain('LOG_SECRET');
    } finally {
      logSpy.mockRestore();
    }
  });
});
