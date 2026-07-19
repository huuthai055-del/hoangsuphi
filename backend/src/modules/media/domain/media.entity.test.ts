import { describe, expect, mock, test } from 'bun:test';
import { MediaMapper } from '../repository/media.mapper';
import { MediaDomainError } from './media-errors';
import { Media } from './media.entity';
import type { IMediaStorage } from './storage.interface';

describe('Media Domain Entity & Storage Mock', () => {
  const mediaId = '019f4bc4-f550-7d52-bba4-3b6258b55705';
  const fileName = 'scenic-mountains.jpg';
  const storageKey = 'uploads/2026/07/scenic-mountains.jpg';
  const mimeType = 'image/jpeg';
  const mediaType = 'IMAGE';
  const fileSize = 1024 * 1024 * 2; // 2MB
  const hash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b275d9c022fcdc';

  describe('Creation & Validation Invariants', () => {
    test('should successfully create a valid media instance in UPLOADING status', () => {
      const now = new Date();
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
        now,
      });

      expect(media.id).toBe(mediaId);
      expect(media.fileName).toBe(fileName);
      expect(media.storageKey).toBe(storageKey);
      expect(media.mimeType).toBe(mimeType);
      expect(media.mediaType).toBe(mediaType);
      expect(media.fileSize).toBe(fileSize);
      expect(media.hash).toBe(hash);
      expect(media.status).toBe('UPLOADING');
      expect(media.ownerType).toBeNull();
      expect(media.ownerId).toBeNull();
      expect(media.createdAt).toBe(now);
      expect(media.deletedAt).toBeNull();
    });

    test('should throw MediaDomainError when ID is blank', () => {
      expect(() => {
        Media.create({
          id: '',
          fileName,
          storageKey,
          mimeType,
          mediaType,
          fileSize,
          hash,
        });
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when file name is blank', () => {
      expect(() => {
        Media.create({
          id: mediaId,
          fileName: '  ',
          storageKey,
          mimeType,
          mediaType,
          fileSize,
          hash,
        });
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when storage key is blank', () => {
      expect(() => {
        Media.create({
          id: mediaId,
          fileName,
          storageKey: '',
          mimeType,
          mediaType,
          fileSize,
          hash,
        });
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when MIME type is blank', () => {
      expect(() => {
        Media.create({
          id: mediaId,
          fileName,
          storageKey,
          mimeType: '   ',
          mediaType,
          fileSize,
          hash,
        });
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when file size is zero or negative', () => {
      expect(() => {
        Media.create({
          id: mediaId,
          fileName,
          storageKey,
          mimeType,
          mediaType,
          fileSize: 0,
          hash,
        });
      }).toThrow(MediaDomainError);

      expect(() => {
        Media.create({
          id: mediaId,
          fileName,
          storageKey,
          mimeType,
          mediaType,
          fileSize: -100,
          hash,
        });
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when hash is blank', () => {
      expect(() => {
        Media.create({
          id: mediaId,
          fileName,
          storageKey,
          mimeType,
          mediaType,
          fileSize,
          hash: '',
        });
      }).toThrow(MediaDomainError);
    });
  });

  describe('Lifecycle State Transitions', () => {
    test('should reject direct transition from UPLOADING to READY', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      expect(() => media.markReady()).toThrow(MediaDomainError);
      expect(media.status).toBe('UPLOADING');
    });

    test('should successfully transition from UPLOADING to PROCESSING', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.markProcessing();
      expect(media.status).toBe('PROCESSING');
    });

    test('should successfully transition from PROCESSING to READY', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.markProcessing();
      media.markReady();
      expect(media.status).toBe('READY');
    });

    test('should successfully transition from UPLOADING to FAILED', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.markFailed();
      expect(media.status).toBe('FAILED');
    });

    test('should successfully transition from UPLOADING to DELETED (soft delete)', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.softDelete();
      expect(media.status).toBe('DELETED');
      expect(media.deletedAt).toBeInstanceOf(Date);
    });

    test('should throw MediaDomainError when transitioning from READY to UPLOADING (illegal)', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.markProcessing();
      media.markReady();
      expect(() => {
        media.markProcessing();
      }).toThrow(MediaDomainError);
    });

    test('should throw MediaDomainError when attempting to modify a soft-deleted media', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      media.softDelete();
      expect(() => {
        media.markReady();
      }).toThrow(MediaDomainError);
    });

    test('should successfully assign owner to media', () => {
      const media = Media.create({
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
      });

      const ownerId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
      media.assignOwner('ARTICLE', ownerId);
      expect(media.ownerType).toBe('ARTICLE');
      expect(media.ownerId).toBe(ownerId);
    });
  });

  describe('Storage Abstraction Contract Verification', () => {
    test('should allow mocking IMediaStorage successfully', async () => {
      const mockUpload = mock(() => Promise.resolve());
      const mockDownload = mock(() => Promise.resolve(Buffer.from('mock file data')));
      const mockDelete = mock(() => Promise.resolve());
      const mockExists = mock(() => Promise.resolve(true));
      const mockGetUrl = mock(() => Promise.resolve('https://s3.hoangsuphi.vn/file.jpg'));

      const storage: IMediaStorage = {
        upload: mockUpload,
        download: mockDownload,
        delete: mockDelete,
        exists: mockExists,
        getUrl: mockGetUrl,
      };

      const buffer = Buffer.from('mock file data');
      await storage.upload(storageKey, buffer, mimeType);
      await storage.delete(storageKey);
      const exists = await storage.exists(storageKey);
      const url = await storage.getUrl(storageKey);

      expect(mockUpload).toHaveBeenCalledWith(storageKey, buffer, mimeType);
      expect(mockDelete).toHaveBeenCalledWith(storageKey);
      expect(mockExists).toHaveBeenCalledWith(storageKey);
      expect(mockGetUrl).toHaveBeenCalledWith(storageKey);
      expect(exists).toBe(true);
      expect(url).toBe('https://s3.hoangsuphi.vn/file.jpg');
    });
  });

  describe('Schema Mapping Verification', () => {
    test('should successfully map between raw persistence object and Domain Entity', () => {
      const raw = {
        id: mediaId,
        fileName,
        storageKey,
        mimeType,
        mediaType,
        fileSize,
        hash,
        status: 'READY',
        storageProvider: 'LOCAL',
        altText: null,
        caption: null,
        ownerType: 'ARTICLE',
        ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
        uploadedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const domain = MediaMapper.toDomain(raw);
      expect(domain.id).toBe(raw.id);
      expect(domain.status).toBe('READY');
      expect(domain.ownerType).toBe('ARTICLE');

      const persistence = MediaMapper.toPersistence(domain);
      expect(persistence.id).toBe(raw.id);
      expect(persistence.fileName).toBe(raw.fileName);
      expect(persistence.status).toBe(raw.status);
    });
  });
});
