import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import type { Hono } from 'hono';
import { Media } from '../domain/media.entity';

import { CloudinaryStorageAdapter } from '../repository/cloudinary-storage.adapter';
import { LocalStorageAdapter } from '../repository/local-storage.adapter';
import { SharpImageProcessor } from '../repository/sharp-image-processor';

const INTERNAL_MEDIA_RESPONSE_FIELDS = new Set([
  'storageKey',
  'hash',
  'status',
  'storageProvider',
  'uploadedBy',
  'ownerType',
  'ownerId',
]);

function collectObjectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...collectObjectKeys(nestedValue),
  ]);
}

function expectNoInternalMediaFields(payload: unknown): void {
  const responseKeys = collectObjectKeys(payload);
  for (const internalField of INTERNAL_MEDIA_RESPONSE_FIELDS) {
    expect(responseKeys).not.toContain(internalField);
  }
}

describe('Media API Routing & Controller', () => {
  let app: Hono;

  const mockFindById = mock((_id: string) => Promise.resolve<Media | null>(null));
  const mockFindByHash = mock((_hash: string) => Promise.resolve<Media | null>(null));
  const mockFindScopedDuplicate = mock((_props: any) => Promise.resolve<Media | null>(null));
  const mockSave = mock((_media: Media) => Promise.resolve());
  const mockUpdate = mock((_media: Media) => Promise.resolve());
  const mockDelete = mock((_id: string) => Promise.resolve());
  const mockTransitionToProcessing = mock((_id: string) => Promise.resolve());
  const mockTransitionToFailed = mock((_id: string) => Promise.resolve());
  const mockFinalizeProcessedMedia = mock((_props: any) => Promise.resolve());
  const mockGetVariants = mock((_id: string) => Promise.resolve<any[]>([]));
  const mockGetMetadata = mock((_id: string) => Promise.resolve<any | null>(null));

  const mockStorageUpload = mock((_key: string, _buf: Buffer, _mime: string) => Promise.resolve());
  const mockStorageExists = mock((_key: string) => Promise.resolve(true));
  const mockStorageDownload = mock((_key: string) =>
    Promise.resolve(Buffer.from('source image buffer'))
  );

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();

    try {
      spyOn(DrizzlePermissionRepository.prototype, 'findByUserId').mockImplementation(async () => {
        return ['media:upload', 'media:read', 'media:delete'];
      });
    } catch {
      // Ignored if spy is already mounted
    }

    // Prototype spys for Local Storage
    spyOn(LocalStorageAdapter.prototype, 'upload').mockImplementation(mockStorageUpload);
    spyOn(LocalStorageAdapter.prototype, 'exists').mockImplementation(mockStorageExists);
    spyOn(LocalStorageAdapter.prototype, 'download').mockImplementation(mockStorageDownload);
    spyOn(LocalStorageAdapter.prototype, 'delete').mockImplementation(async () =>
      Promise.resolve()
    );
    spyOn(LocalStorageAdapter.prototype, 'getUrl').mockImplementation(async (key) =>
      Promise.resolve(`/uploads/${key}`)
    );

    // Prototype spys for Cloudinary Storage
    spyOn(CloudinaryStorageAdapter.prototype, 'upload').mockImplementation(mockStorageUpload);
    spyOn(CloudinaryStorageAdapter.prototype, 'exists').mockImplementation(mockStorageExists);
    spyOn(CloudinaryStorageAdapter.prototype, 'download').mockImplementation(mockStorageDownload);
    spyOn(CloudinaryStorageAdapter.prototype, 'delete').mockImplementation(async () =>
      Promise.resolve()
    );
    spyOn(CloudinaryStorageAdapter.prototype, 'getUrl').mockImplementation(async (key) =>
      Promise.resolve(`https://cloudinary.com/${key}`)
    );

    // Prototype spys for Sharp Image Processor
    spyOn(SharpImageProcessor.prototype, 'extractMetadata').mockImplementation(async () =>
      Promise.resolve({
        width: 800,
        height: 600,
        gps: null,
        orientation: 1,
      })
    );
    spyOn(SharpImageProcessor.prototype, 'resize').mockImplementation(async () =>
      Promise.resolve({ buffer: Buffer.from('optimized'), fileSize: 5000 })
    );

    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindById.mockClear();
    mockFindByHash.mockClear();
    mockFindScopedDuplicate.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockTransitionToProcessing.mockClear();
    mockTransitionToFailed.mockClear();
    mockFinalizeProcessedMedia.mockClear();
    mockGetVariants.mockClear();
    mockGetMetadata.mockClear();
    mockStorageUpload.mockClear();
    mockStorageExists.mockClear();
    mockStorageDownload.mockClear();

    mockSave.mockImplementation((_media: Media) => Promise.resolve());
    mockGetMetadata.mockImplementation((_id: string) => Promise.resolve(null));

    (globalThis as any).mockMediaFindById = mockFindById;
    (globalThis as any).mockMediaFindByHash = mockFindByHash;
    (globalThis as any).mockMediaFindScopedDuplicate = mockFindScopedDuplicate;
    (globalThis as any).mockMediaSave = mockSave;
    (globalThis as any).mockMediaUpdate = mockUpdate;
    (globalThis as any).mockMediaDelete = mockDelete;
    (globalThis as any).mockMediaTransitionToProcessing = mockTransitionToProcessing;
    (globalThis as any).mockMediaTransitionToFailed = mockTransitionToFailed;
    (globalThis as any).mockMediaFinalizeProcessedMedia = mockFinalizeProcessedMedia;
    (globalThis as any).mockMediaGetVariants = mockGetVariants;
    (globalThis as any).mockMediaGetMetadata = mockGetMetadata;
  });

  const mediaId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const originalKey = 'hoangsuphi/test/media/019f4bc4-f550-7d52-bba4-3b6258b55701/master';

  describe('POST /api/v1/media/upload', () => {
    test('should successfully upload file, coordinate variants pipeline, and return 201', async () => {
      mockFindScopedDuplicate.mockImplementation(() => Promise.resolve(null));
      mockGetMetadata.mockImplementation(() =>
        Promise.resolve({
          width: 1920,
          height: 1080,
          mimeType: 'image/webp',
          fileSize: 5000,
        })
      );

      mockFindById.mockImplementation(() => {
        const processed = Media.create({
          id: mediaId,
          fileName: 'original.jpg',
          storageKey: originalKey,
          mimeType: 'image/jpeg',
          mediaType: 'IMAGE',
          fileSize: 10000,
          hash: 'hash123',
          storageProvider: 'CLOUDINARY',
          uploadedBy: '00000000-0000-0000-0000-000000000001',
          altText: 'Sample Alt',
        });
        processed.markProcessing();
        processed.markReady();
        return Promise.resolve(processed);
      });

      mockGetVariants.mockImplementation(() =>
        Promise.resolve([
          {
            variantType: 'thumbnail',
            storageKey: 'hoangsuphi/test/media/019f4bc4-f550-7d52-bba4-3b6258b55701/thumbnail',
            width: 320,
            height: 320,
            fileSize: 1234,
          },
        ])
      );

      const formData = new FormData();
      const file = new File(
        [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])],
        'original.jpg',
        { type: 'image/jpeg' }
      );
      formData.append('file', file);
      formData.append('altText', 'Sample Alt');

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.data.id).toBe(mediaId);
      expect(body.data.altText).toBe('Sample Alt');
      expect(body.data.width).toBe(1920);
      expect(body.data.height).toBe(1080);
      expect(body.data.mimeType).toBe('image/webp');
      expect(body.data.fileSize).toBe(5000);
      expect(body.data.fileName).toBe('original.webp');
      expect(body.data.variants).toHaveLength(1);
      expect(body.data.variants[0].variantType).toBe('thumbnail');
      expect(body.data.variants[0].url).toContain('https://cloudinary.com/');
      expect(body.meta.deduplicated).toBe(false);
      expectNoInternalMediaFields(body);
      expect(mockStorageUpload).toHaveBeenCalled();
      expect(mockFinalizeProcessedMedia).toHaveBeenCalled();
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

    test('should reject multipart file field when it is not a File', async () => {
      const formData = new FormData();
      formData.append('file', 'not-a-file');

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001');
    });

    test('should return 401 Unauthorized if authorization token is missing', async () => {
      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        body: new FormData(),
      });

      expect(res.status).toBe(401);
    });

    test('should return 403 when the authenticated user lacks media:upload permission', async () => {
      spyOn(DrizzlePermissionRepository.prototype, 'findByUserId').mockImplementation(
        async () => []
      );
      const formData = new FormData();
      formData.append(
        'file',
        new File(
          [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])],
          'photo.jpg',
          { type: 'image/jpeg' }
        )
      );

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(403);
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockStorageUpload).not.toHaveBeenCalled();
    });

    test('should reject multiple files in the single-file upload contract', async () => {
      const formData = new FormData();
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      formData.append('file', new File([jpeg], 'first.jpg', { type: 'image/jpeg' }));
      formData.append('file', new File([jpeg], 'second.jpg', { type: 'image/jpeg' }));

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(400);
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockStorageUpload).not.toHaveBeenCalled();
    });

    test('should reject declared JPEG whose magic bytes identify PNG', async () => {
      const formData = new FormData();
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      formData.append('file', new File([pngHeader], 'spoofed.jpg', { type: 'image/jpeg' }));

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(400);
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockStorageUpload).not.toHaveBeenCalled();
    });

    test('should reject non-image file uploads (e.g. PDF) with 400 and MED_VAL_002', async () => {
      const formData = new FormData();
      const file = new File([Buffer.from('PDF header dummy bytes')], 'document.pdf', {
        type: 'application/pdf',
      });
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('MED_VAL_002');
    });

    test('should reject upload request if it contains forbidden text fields like ownerType or ownerId', async () => {
      const formData = new FormData();
      const file = new File(
        [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      formData.append('file', file);
      formData.append('ownerType', 'place');
      formData.append('ownerId', 'some-uuid');

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001'); // Zod strict validation failure
    });

    test('should reject upload if payload exceeds 10MB limit via Hono bodyLimit middleware', async () => {
      const formData = new FormData();
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001');
    });

    test('should return 500 without leaking sensitive messages if database throws internal error', async () => {
      mockFindScopedDuplicate.mockImplementation(() => Promise.resolve(null));
      mockSave.mockImplementation(() => {
        return Promise.reject(
          new Error('FATAL: Connection failed for user postgres with password SUPER_SECRET_PW')
        );
      });

      const formData = new FormData();
      const file = new File(
        [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('MED_SYS_001');
      expect(body.detail).toBe('Failed to process and store media file');
      expect(JSON.stringify(body)).not.toContain('SUPER_SECRET_PW');
    });

    test('should successfully process file of exactly 10MB (bypasses ingress limit, allowed by service)', async () => {
      mockFindScopedDuplicate.mockImplementation(() => Promise.resolve(null));
      mockGetMetadata.mockImplementation(() => Promise.resolve({ width: 1920, height: 1080 }));

      mockFindById.mockImplementation(() => {
        const processed = Media.create({
          id: mediaId,
          fileName: 'original.jpg',
          storageKey: originalKey,
          mimeType: 'image/jpeg',
          mediaType: 'IMAGE',
          fileSize: 10 * 1024 * 1024,
          hash: 'hash-exactly-10mb',
          storageProvider: 'CLOUDINARY',
          uploadedBy: '00000000-0000-0000-0000-000000000001',
        });
        processed.markProcessing();
        processed.markReady();
        return Promise.resolve(processed);
      });

      const formData = new FormData();
      const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const bodyBytes = Buffer.alloc(10 * 1024 * 1024 - header.length);
      const exactly10MB = Buffer.concat([header, bodyBytes]);

      const file = new File([exactly10MB], 'exactly10mb.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.fileSize).toBe(10 * 1024 * 1024);
    });

    test('should reject upload of 10.1MB file (bypasses ingress limit, rejected by service)', async () => {
      const formData = new FormData();
      const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const bodyBytes = Buffer.alloc(Math.floor(10.1 * 1024 * 1024) - header.length);
      const fileBytes = Buffer.concat([header, bodyBytes]);

      const file = new File([fileBytes], 'file_10_1mb.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('MED_VAL_003');
      expect(body.detail).toContain('exceeds maximum allowed size');
    });

    test('should reject SVG file uploads with 400 and MED_VAL_002', async () => {
      const formData = new FormData();
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const file = new File([Buffer.from(svgContent)], 'image.svg', { type: 'image/svg+xml' });
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('MED_VAL_002');
    });

    test('should return 409 with fixed safe message when DB concurrent insert raises ScopedDuplicateConflictError', async () => {
      const { ScopedDuplicateConflictError: SDCError } = await import(
        '../repository/repository-errors'
      );
      mockFindScopedDuplicate.mockImplementation(() => Promise.resolve(null));
      mockSave.mockImplementation(() => {
        throw new SDCError(
          'Duplicate active unbound media found for hash: abc123secret and uploader: user-uuid-secret'
        );
      });

      const formData = new FormData();
      const file = new File(
        [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(409);
      const responseText = JSON.stringify(await res.json());
      // Must NOT leak internal identifiers
      expect(responseText).not.toContain('abc123secret');
      expect(responseText).not.toContain('user-uuid-secret');
      expect(responseText).not.toContain('hash');
      expect(responseText).not.toContain('uploader');
      expect(responseText).not.toContain('media_unbound_active_hash_unique_idx');
    });

    test('should return 500 without leaking sensitive fields anywhere in response (deep scan)', async () => {
      mockFindScopedDuplicate.mockImplementation(() => Promise.resolve(null));
      mockSave.mockImplementation(() => {
        return Promise.reject(
          new Error('FATAL: Connection failed for user postgres with password SUPER_SECRET_PW')
        );
      });

      const formData = new FormData();
      const file = new File(
        [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      formData.append('file', file);

      const res = await app.request('/api/v1/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      expect(res.status).toBe(500);
      const responseText = JSON.stringify(await res.json());
      // Deep scan — sentinel must not appear anywhere in the serialized response
      expect(responseText).not.toContain('SUPER_SECRET_PW');
      expect(responseText).not.toContain('storageKey');
      expect(responseText).not.toContain('storageProvider');
      expect(responseText).not.toContain('uploadedBy');
    });
  });

  describe('GET /api/v1/media/:id', () => {
    test('should return media metadata detail', async () => {
      const readyMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
        storageProvider: 'CLOUDINARY',
        uploadedBy: '00000000-0000-0000-0000-000000000001',
      });
      readyMedia.markProcessing();
      readyMedia.markReady();
      mockFindById.mockImplementation(() => Promise.resolve(readyMedia));
      mockGetVariants.mockImplementation(() => Promise.resolve([]));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.meta).toBeDefined();
      expect(body.data.id).toBe(mediaId);
      expect(body.data.fileName).toBe('original.jpg');
      expectNoInternalMediaFields(body);
    });

    test('should return 404 if media is missing', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(404);
    });

    test('should not publish a FAILED media record through the public read endpoint', async () => {
      const failedMedia = Media.create({
        id: mediaId,
        fileName: 'failed.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 100,
        hash: 'failed-hash',
        storageProvider: 'CLOUDINARY',
        uploadedBy: '00000000-0000-0000-0000-000000000001',
      });
      failedMedia.markFailed();
      mockFindById.mockImplementation(() => Promise.resolve(failedMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/media/:id/variants', () => {
    test('should return array of generated variants', async () => {
      const readyMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
        storageProvider: 'CLOUDINARY',
        uploadedBy: '00000000-0000-0000-0000-000000000001',
      });
      readyMedia.markProcessing();
      readyMedia.markReady();
      mockFindById.mockImplementation(() => Promise.resolve(readyMedia));
      mockGetVariants.mockImplementation(() =>
        Promise.resolve([
          {
            variantType: 'thumbnail',
            storageKey: 'hoangsuphi/test/media/019f4bc4-f550-7d52-bba4-3b6258b55701/thumbnail',
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
      expect(body.error).toBeNull();
      expect(body.meta).toBeDefined();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].variantType).toBe('thumbnail');
      expect(body.data[0].url).toContain('https://cloudinary.com/');
      expectNoInternalMediaFields(body);
    });
  });

  describe('DELETE /api/v1/media/:id', () => {
    test('should soft-delete media when caller is the uploader (uploadedBy match)', async () => {
      const uploadedByCallerMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash-uploader',
        storageProvider: 'CLOUDINARY',
        uploadedBy: '00000000-0000-0000-0000-000000000001',
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
      const differentUploaderMedia = Media.create({
        id: mediaId,
        fileName: 'original.jpg',
        storageKey: originalKey,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 10000,
        hash: 'hash123',
        storageProvider: 'CLOUDINARY',
        uploadedBy: '00000000-0000-0000-0000-000000000099',
      });
      mockFindById.mockImplementation(() => Promise.resolve(differentUploaderMedia));

      const res = await app.request(`/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
    });
  });
});
