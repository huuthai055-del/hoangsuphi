import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  FileTooLargeError,
  MediaValidationError,
  UnsupportedMediaTypeError,
} from '../domain/media-errors';
import { Media } from '../domain/media.entity';
import type { IMediaStorage } from '../domain/storage.interface';
import type { IMediaRepository } from '../repository/media-repository.interface';
import { MediaUploadService } from './media-upload.service';
import { MediaValidationPolicy } from './media-validation.policy';
import { StorageKeyGenerator } from './storage-key.generator';

describe('MediaUploadService', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let findByHashMock: ReturnType<typeof mock>;
  let saveMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let deleteMock: ReturnType<typeof mock>;

  let uploadStorageMock: ReturnType<typeof mock>;
  let deleteStorageMock: ReturnType<typeof mock>;
  let existsStorageMock: ReturnType<typeof mock>;
  let getUrlStorageMock: ReturnType<typeof mock>;

  let mediaRepo: IMediaRepository;
  let storage: IMediaStorage;
  let service: MediaUploadService;

  const validFileName = 'landscape.png';
  const validMimeType = 'image/png';
  const validBuffer = Buffer.from('mock png file content');

  beforeEach(() => {
    // Repository mocks
    findByIdMock = mock(() => Promise.resolve(null));
    findByHashMock = mock(() => Promise.resolve(null));
    saveMock = mock(() => Promise.resolve());
    updateMock = mock(() => Promise.resolve());
    deleteMock = mock(() => Promise.resolve());

    mediaRepo = {
      findById: findByIdMock,
      findByHash: findByHashMock,
      findScopedDuplicate: mock(() => Promise.resolve(null)),
      save: saveMock,
      update: updateMock,
      delete: deleteMock,
      transitionToProcessing: mock(() => Promise.resolve()),
      transitionToFailed: mock(() => Promise.resolve()),
      finalizeProcessedMedia: mock(() => Promise.resolve()),
      saveMetadata: mock(() => Promise.resolve()),
      saveVariant: mock(() => Promise.resolve()),
      getMetadata: mock(() => Promise.resolve(null)),
      getVariants: mock(() => Promise.resolve([])),
      listPurgeCandidates: mock(() => Promise.resolve([])),
      hardDeletePurged: mock(() => Promise.resolve()),
    };

    // Storage mocks
    uploadStorageMock = mock(() => Promise.resolve());
    deleteStorageMock = mock(() => Promise.resolve());
    existsStorageMock = mock(() => Promise.resolve(true));
    getUrlStorageMock = mock(() => Promise.resolve('https://s3.hoangsuphi.vn/file.jpg'));

    storage = {
      upload: uploadStorageMock,
      download: mock(() => Promise.resolve(Buffer.from('source'))),
      delete: deleteStorageMock,
      exists: existsStorageMock,
      getUrl: getUrlStorageMock,
    };

    service = new MediaUploadService(mediaRepo, storage);
  });

  describe('Validation & Flow Guarding', () => {
    test('should throw MediaValidationError if filename contains path traversal', async () => {
      for (const fileName of [
        '../escaped-file.png',
        '..\\escaped-file.png',
        '/tmp/escaped-file.png',
        'C:\\temp\\escaped-file.png',
      ]) {
        await expect(
          service.upload({
            fileName,
            mimeType: validMimeType,
            fileBuffer: validBuffer,
          })
        ).rejects.toThrow(MediaValidationError);
      }

      expect(saveMock).not.toHaveBeenCalled();
      expect(uploadStorageMock).not.toHaveBeenCalled();
    });

    test('should throw UnsupportedMediaTypeError for unmapped MIME types', async () => {
      await expect(
        service.upload({
          fileName: validFileName,
          mimeType: 'application/octet-stream',
          fileBuffer: validBuffer,
        })
      ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    test('should throw FileTooLargeError if file buffer exceeds size config limits', async () => {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB image (limit is 10MB)
      await expect(
        service.upload({
          fileName: validFileName,
          mimeType: validMimeType,
          fileBuffer: hugeBuffer,
        })
      ).rejects.toThrow(FileTooLargeError);
    });
  });

  describe('MediaValidationPolicy & StorageKeyGenerator Unit Tests', () => {
    test('should throw validation error if filename is empty or invalid', () => {
      expect(() => MediaValidationPolicy.validateFileName('')).toThrow(MediaValidationError);
      expect(() => MediaValidationPolicy.validateFileName('   ')).toThrow(MediaValidationError);
      expect(() => MediaValidationPolicy.validateFileName('???')).toThrow(MediaValidationError);
    });

    test('should reject a sanitized filename longer than the database column limit', () => {
      expect(() => MediaValidationPolicy.validateFileName(`${'a'.repeat(252)}.jpg`)).toThrow(
        MediaValidationError
      );
    });

    test('should throw validation error if mimeType is empty', () => {
      expect(() => MediaValidationPolicy.determineMediaTypeAndLimit('', 100)).toThrow(
        UnsupportedMediaTypeError
      );
    });

    test('should validate large video and document limits', () => {
      // Limit for video is 50MB
      expect(() =>
        MediaValidationPolicy.determineMediaTypeAndLimit('video/mp4', 51 * 1024 * 1024)
      ).toThrow(FileTooLargeError);
      expect(
        MediaValidationPolicy.determineMediaTypeAndLimit('video/mp4', 40 * 1024 * 1024).mediaType
      ).toBe('VIDEO');

      // Limit for document is 20MB
      expect(() =>
        MediaValidationPolicy.determineMediaTypeAndLimit('application/pdf', 21 * 1024 * 1024)
      ).toThrow(FileTooLargeError);
      expect(
        MediaValidationPolicy.determineMediaTypeAndLimit('application/pdf', 10 * 1024 * 1024)
          .mediaType
      ).toBe('DOCUMENT');
    });

    test('StorageKeyGenerator should generate structured key', () => {
      const result = StorageKeyGenerator.generate('test.png', new Date('2026-07-15T00:00:00Z'));
      expect(result.id).toBeDefined();
      expect(result.storageKey).toContain('uploads/2026/07/');
      expect(result.storageKey).toContain('-test.png');
    });
  });

  describe('Duplicate Detection & Deduplication', () => {
    test('should return existing media instance and bypass storage upload if hash matches ready file', async () => {
      const existingMedia = Media.create({
        id: '019f4bc4-f550-7d52-bba4-3b6258b55709',
        fileName: validFileName,
        storageKey: 'uploads/2026/07/duplicate.png',
        mimeType: validMimeType,
        mediaType: 'IMAGE',
        fileSize: validBuffer.length,
        hash: 'e69888ad2287232230',
      });
      existingMedia.markProcessing();
      existingMedia.markReady();
      findByHashMock.mockImplementation(() => Promise.resolve(existingMedia));

      const result = await service.upload({
        fileName: validFileName,
        mimeType: validMimeType,
        fileBuffer: validBuffer,
      });

      expect(result).toBe(existingMedia);
      expect(uploadStorageMock).not.toHaveBeenCalled();
      expect(saveMock).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Safety & Cleanups', () => {
    test('should clean up storage key file if database save fails', async () => {
      saveMock.mockImplementation(() => Promise.reject(new Error('DB Save Failed')));

      await expect(
        service.upload({
          fileName: validFileName,
          mimeType: validMimeType,
          fileBuffer: validBuffer,
        })
      ).rejects.toThrow('DB Save Failed');

      expect(uploadStorageMock).toHaveBeenCalled();
      expect(deleteStorageMock).toHaveBeenCalled();
    });

    test('should suppress storage delete exceptions and bubble up actual DB save error', async () => {
      saveMock.mockImplementation(() => Promise.reject(new Error('DB Save Failed')));
      deleteStorageMock.mockImplementation(() => Promise.reject(new Error('Disk Disconnected')));

      await expect(
        service.upload({
          fileName: validFileName,
          mimeType: validMimeType,
          fileBuffer: validBuffer,
        })
      ).rejects.toThrow('DB Save Failed');

      expect(deleteStorageMock).toHaveBeenCalled();
    });

    test('should clean up both storage file and db record if confirmation update fails', async () => {
      updateMock.mockImplementation(() => Promise.reject(new Error('DB Update Failed')));

      await expect(
        service.upload({
          fileName: validFileName,
          mimeType: validMimeType,
          fileBuffer: validBuffer,
        })
      ).rejects.toThrow();

      expect(uploadStorageMock).toHaveBeenCalled();
      expect(deleteStorageMock).toHaveBeenCalled();
      expect(deleteMock).toHaveBeenCalled();
    });

    test('should upload successfully and update DB state to READY', async () => {
      const result = await service.upload({
        fileName: validFileName,
        mimeType: validMimeType,
        fileBuffer: validBuffer,
      });

      expect(result.status).toBe('READY');
      expect(uploadStorageMock).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
