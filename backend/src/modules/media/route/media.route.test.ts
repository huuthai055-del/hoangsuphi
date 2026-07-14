import { expect, test, describe, beforeEach, spyOn, mock } from 'bun:test';
import type { Hono } from 'hono';
import { Media } from '../domain/media.entity';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';

import { LocalStorageAdapter } from '../repository/local-storage.adapter';
import { NativeImageProcessor } from '../repository/native-image-processor';

describe('Media API Routing & Controller', () => {
  let app: Hono;

  const mockFindById = mock((_id: string) => Promise.resolve<Media | null>(null));
  const mockFindByHash = mock((_hash: string) => Promise.resolve<Media | null>(null));
  const mockSave = mock((_media: Media) => Promise.resolve());
  const mockUpdate = mock((_media: Media) => Promise.resolve());
  const mockDelete = mock((_id: string) => Promise.resolve());
  const mockSaveMetadata = mock((_id: string, _meta: any) => Promise.resolve());
  const mockSaveVariant = mock((_props: any) => Promise.resolve());
  const mockGetVariants = mock((_id: string) => Promise.resolve<any[]>([]));

  const mockStorageUpload = mock((_key: string, _buf: Buffer, _mime: string) => Promise.resolve());
  const mockStorageExists = mock((_key: string) => Promise.resolve(true));
  const mockStorageDownload = mock((_key: string) => Promise.resolve(Buffer.from('source image buffer')));

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();

    // Force mock permissions for Media module
    try {
      spyOn(DrizzlePermissionRepository.prototype, 'findByUserId').mockImplementation(async () => {
        return ['media:upload', 'media:read', 'media:delete'];
      });
    } catch {
      // Ignored if spy is already mounted
    }

    // Prototype spys for Storage Adapter
    spyOn(LocalStorageAdapter.prototype, 'upload').mockImplementation(mockStorageUpload);
    spyOn(LocalStorageAdapter.prototype, 'exists').mockImplementation(mockStorageExists);
    spyOn(LocalStorageAdapter.prototype, 'download').mockImplementation(mockStorageDownload);
    spyOn(LocalStorageAdapter.prototype, 'delete').mockImplementation(async () => Promise.resolve());
    spyOn(LocalStorageAdapter.prototype, 'getUrl').mockImplementation(async (key) => Promise.resolve(`/uploads/${key}`));

    // Prototype spys for Image Processor
    spyOn(NativeImageProcessor.prototype, 'extractMetadata').mockImplementation(async () =>
      Promise.resolve({
        width: 800,
        height: 600,
        gps: { latitude: 22.75, longitude: 104.75 },
      })
    );
    spyOn(NativeImageProcessor.prototype, 'resize').mockImplementation(async () =>
      Promise.resolve({ buffer: Buffer.from('optimized'), fileSize: 5000 })
    );

    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindById.mockClear();
    mockFindByHash.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockSaveMetadata.mockClear();
    mockSaveVariant.mockClear();
    mockGetVariants.mockClear();
    mockStorageUpload.mockClear();
    mockStorageExists.mockClear();
    mockStorageDownload.mockClear();

    (globalThis as any).mockMediaFindById = mockFindById;
    (globalThis as any).mockMediaFindByHash = mockFindByHash;
    (globalThis as any).mockMediaSave = mockSave;
    (globalThis as any).mockMediaUpdate = mockUpdate;
    (globalThis as any).mockMediaDelete = mockDelete;
    (globalThis as any).mockMediaSaveMetadata = mockSaveMetadata;
    (globalThis as any).mockMediaSaveVariant = mockSaveVariant;
    (globalThis as any).mockMediaGetVariants = mockGetVariants;
  });

  const mediaId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const originalKey = 'uploads/2026/07/original.jpg';

  const sampleMedia = Media.create({
    id: mediaId,
    fileName: 'original.jpg',
    storageKey: originalKey,
    mimeType: 'image/jpeg',
    mediaType: 'IMAGE',
    fileSize: 10000,
    hash: 'hash123',
    ownerType: 'ARTICLE',
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55702',
  });

  describe('POST /api/v1/media/upload', () => {
    test('should successfully upload file, coordinate variants pipeline, and return 201', async () => {
      mockFindByHash.mockImplementation(() => Promise.resolve(null));
      
      // Setup state progression for repo findById refresh
      let lookupCount = 0;
      mockFindById.mockImplementation(() => {
        lookupCount++;
        if (lookupCount === 1) return Promise.resolve(sampleMedia);
        // Simulate process finished state READY
        const processed = Media.create({
          id: mediaId,
          fileName: 'original.jpg',
          storageKey: originalKey,
          mimeType: 'image/jpeg',
          mediaType: 'IMAGE',
          fileSize: 10000,
          hash: 'hash123',
        });
        processed.markReady();
        return Promise.resolve(processed);
      });

      const formData = new FormData();
      const file = new File(['image dummy bytes'], 'original.jpg', { type: 'image/jpeg' });
      formData.append('file', file);
      formData.append('ownerType', 'ARTICLE');
      formData.append('ownerId', '019f4bc4-f550-7d52-bba4-3b6258b55702');

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe(mediaId);
      expect(body.status).toBe('READY');
      expect(mockStorageUpload).toHaveBeenCalled();
      expect(mockSaveMetadata).toHaveBeenCalled();
    });

    test('should return 400 if file parameter is missing', async () => {
      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: new FormData(),
      });

      expect(res.status).toBe(400);
    });

    test('should return 403 Forbidden if authorization token is missing', async () => {
      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        body: new FormData(),
      });

      expect(res.status).toBe(401); // Unauthorized
    });
  });

  describe('GET /api/v1/media/:id', () => {
    test('should return media metadata detail', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(mediaId);
      expect(body.fileName).toBe('original.jpg');
    });

    test('should return 404 if media is missing', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/media/:id/variants', () => {
    test('should return array of generated variants', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleMedia));
      mockGetVariants.mockImplementation(() =>
        Promise.resolve([
          {
            variantType: 'thumbnail',
            storageKey: 'uploads/2026/07/thumbnail.webp',
            width: 150,
            height: 150,
            fileSize: 4500,
          },
        ])
      );

      const res = await app.request(`/api/v1/media/${mediaId}/variants`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].variantType).toBe('thumbnail');
      expect(body.data[0].url).toBe('/uploads/uploads/2026/07/thumbnail.webp');
    });
  });

  describe('POST /api/v1/media/upload - ownerType=USER constraint', () => {
    test('should return 400 when ownerType is USER and ownerId does not match caller', async () => {
      const formData = new FormData();
      formData.append('file', new File(['data'], 'test.jpg', { type: 'image/jpeg' }));
      formData.append('ownerType', 'USER');
      // ownerId is a valid UUID but belongs to a different user
      formData.append('ownerId', '00000000-0000-0000-0000-000000000099');

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001');
    });
  });

  describe('DELETE /api/v1/media/:id', () => {
    test('should soft-delete media when caller is the uploader (uploadedBy match)', async () => {
      // uploadedBy must match the mock user id ('00000000-0000-0000-0000-000000000001')
      const uploadedByCallerMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash-uploader',
        ownerType: 'ARTICLE',
        ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55702', // content entity — NOT the user
        uploadedBy: '00000000-0000-0000-0000-000000000001', // uploader == caller
      });
      mockFindById.mockImplementation(() => Promise.resolve(uploadedByCallerMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should return 403 when caller is NOT the uploader', async () => {
      // sampleMedia has uploadedBy=null — no uploader recorded, non-admin cannot delete
      mockFindById.mockImplementation(() => Promise.resolve(sampleMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
    });

    test('should return 403 when uploadedBy belongs to a different user', async () => {
      const otherUploaderMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash-other',
        uploadedBy: '00000000-0000-0000-0000-000000000099', // different user uploaded it
      });
      mockFindById.mockImplementation(() => Promise.resolve(otherUploaderMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
    });
  });
});

