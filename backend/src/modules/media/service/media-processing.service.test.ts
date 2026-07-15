import { expect, test, describe, beforeEach, mock } from 'bun:test';
import { MediaProcessingService } from './media-processing.service';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { IMediaStorage } from '../domain/storage.interface';
import type { IImageProcessor } from '../domain/image-processor.interface';
import { Media } from '../domain/media.entity';
import {
  MediaDomainError,
  StorageProcessingError,
  VariantGenerationError,
} from '../domain/media-errors';

describe('MediaProcessingService', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let saveMetadataMock: ReturnType<typeof mock>;
  let saveVariantMock: ReturnType<typeof mock>;

  let existsStorageMock: ReturnType<typeof mock>;
  let downloadStorageMock: ReturnType<typeof mock>;
  let uploadStorageMock: ReturnType<typeof mock>;
  let deleteStorageMock: ReturnType<typeof mock>;

  let extractMetadataMock: ReturnType<typeof mock>;
  let resizeMock: ReturnType<typeof mock>;

  let mediaRepo: IMediaRepository;
  let storage: IMediaStorage;
  let imageProcessor: IImageProcessor;
  let service: MediaProcessingService;

  const mediaId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const originalKey = 'uploads/2026/07/original.jpg';

  beforeEach(() => {
    // Repository Mock bindings
    findByIdMock = mock(() => Promise.resolve(null));
    updateMock = mock(() => Promise.resolve());
    saveMetadataMock = mock(() => Promise.resolve());
    saveVariantMock = mock(() => Promise.resolve());

    mediaRepo = {
      findById: findByIdMock,
      findByHash: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      update: updateMock,
      delete: mock(() => Promise.resolve()),
      saveMetadata: saveMetadataMock,
      saveVariant: saveVariantMock,
      getMetadata: mock(() => Promise.resolve(null)),
      getVariants: mock(() => Promise.resolve([])),
    };

    // Storage Mock bindings
    existsStorageMock = mock(() => Promise.resolve(true));
    downloadStorageMock = mock(() => Promise.resolve(Buffer.from('original jpeg buffer')));
    uploadStorageMock = mock(() => Promise.resolve());
    deleteStorageMock = mock(() => Promise.resolve());

    storage = {
      upload: uploadStorageMock,
      download: downloadStorageMock,
      delete: deleteStorageMock,
      exists: existsStorageMock,
      getUrl: mock(() => Promise.resolve('https://s3.hoangsuphi.vn/file.jpg')),
    };

    // ImageProcessor Mock bindings
    extractMetadataMock = mock(() =>
      Promise.resolve({
        width: 1920,
        height: 1080,
        cameraMake: 'Sony',
        cameraModel: 'A7III',
        gps: { latitude: 22.75, longitude: 104.75 },
      })
    );
    resizeMock = mock(() => Promise.resolve({ buffer: Buffer.from('optimized variant'), fileSize: 50000 }));

    imageProcessor = {
      extractMetadata: extractMetadataMock,
      resize: resizeMock,
    };

    service = new MediaProcessingService(mediaRepo, storage, imageProcessor);
  });

  describe('Lifecycle State Transitions', () => {
    test('should throw error when trying to process a media file already in READY state', async () => {
      const readyMedia = Media.create({
        id: mediaId,
        fileName: 'image.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
      });
      readyMedia.markReady();
      findByIdMock.mockImplementation(() => Promise.resolve(readyMedia));

      await expect(service.process(mediaId)).rejects.toThrow(MediaDomainError);
    });

    test('should throw StorageProcessingError if original file is missing from storage', async () => {
      const media = Media.create({
        id: mediaId,
        fileName: 'image.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
      });
      findByIdMock.mockImplementation(() => Promise.resolve(media));
      existsStorageMock.mockImplementation(() => Promise.resolve(false));

      await expect(service.process(mediaId)).rejects.toThrow(StorageProcessingError);
      expect(media.status).toBe('FAILED');
    });
  });

  describe('Full Processing Pipeline Workflows', () => {
    test('should successfully extract camera, GPS metadata, write variations, and mark READY', async () => {
      const media = Media.create({
        id: mediaId,
        fileName: 'image.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
      });
      findByIdMock.mockImplementation(() => Promise.resolve(media));

      await service.process(mediaId);

      expect(media.status).toBe('READY');
      expect(downloadStorageMock).toHaveBeenCalledWith(originalKey);
      expect(extractMetadataMock).toHaveBeenCalled();
      expect(saveMetadataMock).toHaveBeenCalled();
      expect(resizeMock).toHaveBeenCalledTimes(3); // thumbnail, medium, large
      expect(uploadStorageMock).toHaveBeenCalledTimes(3);
      expect(saveVariantMock).toHaveBeenCalledTimes(3);
    });

    test('should successfully bypass variant resizing for non-image types (e.g. DOCS)', async () => {
      const media = Media.create({
        id: mediaId,
        fileName: 'document.pdf',
        storageKey: 'uploads/2026/07/doc.pdf',
        mimeType: 'application/pdf',
        mediaType: 'DOCUMENT',
        fileSize: 10000,
        hash: 'hash123',
      });
      findByIdMock.mockImplementation(() => Promise.resolve(media));

      await service.process(mediaId);

      expect(media.status).toBe('READY');
      expect(resizeMock).not.toHaveBeenCalled();
      expect(uploadStorageMock).not.toHaveBeenCalled();
    });
  });

  describe('Fault Tolerant Cleanups', () => {
    test('should clean up upload variants from storage if variant generation crashes', async () => {
      const media = Media.create({
        id: mediaId,
        fileName: 'image.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
      });
      findByIdMock.mockImplementation(() => Promise.resolve(media));
      
      // First variant succeeds, second crashes
      let callCount = 0;
      resizeMock.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Resize Memory Out'));
        }
        return Promise.resolve({ buffer: Buffer.from('optimized variant'), fileSize: 50000 });
      });

      await expect(service.process(mediaId)).rejects.toThrow(VariantGenerationError);
      expect(media.status).toBe('FAILED');
      expect(deleteStorageMock).toHaveBeenCalled(); // clean up the first variant that succeeded
    });
  });
});
