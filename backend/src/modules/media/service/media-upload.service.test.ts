import { expect, test, describe, beforeEach, mock } from 'bun:test';
import { MediaUploadService } from './media-upload.service';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { IMediaStorage } from '../domain/storage.interface';
import { Media } from '../domain/media.entity';
import {
  MediaValidationError,
  UnsupportedMediaTypeError,
  FileTooLargeError,
  StorageUploadError,
} from '../domain/media-errors';

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
      save: saveMock,
      update: updateMock,
      delete: deleteMock,
    };

    // Storage mocks
    uploadStorageMock = mock(() => Promise.resolve());
    deleteStorageMock = mock(() => Promise.resolve());
    existsStorageMock = mock(() => Promise.resolve(true));
    getUrlStorageMock = mock(() => Promise.resolve('https://s3.hoangsuphi.vn/file.jpg'));

    storage = {
      upload: uploadStorageMock,
      delete: deleteStorageMock,
      exists: existsStorageMock,
      getUrl: getUrlStorageMock,
    };

    service = new MediaUploadService(mediaRepo, storage);
  });

  describe('Validation & Flow Guarding', () => {
    test('should throw MediaValidationError if filename contains path traversal', async () => {
      await expect(
        service.upload({
          fileName: '../escaped-file.png',
          mimeType: validMimeType,
          fileBuffer: validBuffer,
        })
      ).rejects.toThrow(MediaValidationError);
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
      ).rejects.toThrow();

      expect(uploadStorageMock).toHaveBeenCalled();
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
