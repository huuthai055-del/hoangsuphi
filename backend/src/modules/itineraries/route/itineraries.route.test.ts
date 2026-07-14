import { expect, test, describe, beforeEach, mock } from 'bun:test';
import type { Hono } from 'hono';
import { Itinerary } from '../domain/itinerary.entity';
import { ItineraryItem } from '../domain/itinerary-item.entity';
import { ItinerariesController } from './itineraries.controller';
import { container } from '@/common/di/container';

describe('Itineraries API Routing & Controller', () => {
  let app: Hono;

  // Mock Spies for Itineraries Service
  const mockCreateItinerary = mock(() => Promise.resolve({} as any));
  const mockUpdateItineraryInfo = mock(() => Promise.resolve({} as any));
  const mockDeleteItinerary = mock(() => Promise.resolve());
  const mockPublishItinerary = mock(() => Promise.resolve({} as any));
  const mockArchiveItinerary = mock(() => Promise.resolve({} as any));
  const mockAddItemToItinerary = mock(() => Promise.resolve({} as any));
  const mockRemoveItemFromItinerary = mock(() => Promise.resolve());
  const mockReorderItineraryItems = mock(() => Promise.resolve());
  const mockGetItinerary = mock(() => Promise.resolve({} as any));
  const mockListItineraries = mock(() => Promise.resolve({ items: [], total: 0 } as any));

  const mockItineraryService = {
    createItinerary: mockCreateItinerary,
    updateItineraryInfo: mockUpdateItineraryInfo,
    deleteItinerary: mockDeleteItinerary,
    publishItinerary: mockPublishItinerary,
    archiveItinerary: mockArchiveItinerary,
    addItemToItinerary: mockAddItemToItinerary,
    removeItemFromItinerary: mockRemoveItemFromItinerary,
    reorderItineraryItems: mockReorderItineraryItems,
    getItinerary: mockGetItinerary,
    listItineraries: mockListItineraries,
  };

  const mockController = new ItinerariesController(mockItineraryService as any);

  const sampleItineraryProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    title: 'Autumn in Hoang Su Phi',
    description: 'spectacular views of rice terraces',
    visibility: 'PRIVATE' as const,
    status: 'DRAFT' as const,
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [],
  };

  const sampleItineraryItemProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55705',
    itineraryId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    dayNumber: 1,
    displayOrder: 1,
    note: 'First stop',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    container.reset();
    container.register('ItinerariesController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockCreateItinerary.mockClear();
    mockUpdateItineraryInfo.mockClear();
    mockDeleteItinerary.mockClear();
    mockPublishItinerary.mockClear();
    mockArchiveItinerary.mockClear();
    mockAddItemToItinerary.mockClear();
    mockRemoveItemFromItinerary.mockClear();
    mockReorderItineraryItems.mockClear();
    mockGetItinerary.mockClear();
    mockListItineraries.mockClear();
  });

  describe('Itinerary Route integrations', () => {
    test('POST /api/v1/itineraries - Create Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockCreateItinerary.mockImplementation(() => Promise.resolve(itinerary));

      const res = await app.request('/api/v1/itineraries', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Autumn in Hoang Su Phi',
          description: 'spectacular views of rice terraces',
          visibility: 'PRIVATE',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(itinerary.id);
      expect(json.title).toBe(itinerary.title);
    });

    test('POST /api/v1/itineraries - Validation 400', async () => {
      const res = await app.request('/api/v1/itineraries', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });

    test('PATCH /api/v1/itineraries/:id - Update Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      const updated = Itinerary.rehydrate({ ...sampleItineraryProps, title: 'Updated Title' });
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockUpdateItineraryInfo.mockImplementation(() => Promise.resolve(updated));

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('Updated Title');
    });

    test('GET /api/v1/itineraries/:id - Get Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(itinerary.id);
    });

    test('DELETE /api/v1/itineraries/:id - Delete Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockDeleteItinerary.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
    });

    test('POST /api/v1/itineraries/:id/items - Add Item Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      const item = ItineraryItem.rehydrate(sampleItineraryItemProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockAddItemToItinerary.mockImplementation(() => Promise.resolve(item));

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}/items`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerType: 'PLACE',
          ownerId: sampleItineraryItemProps.ownerId,
          dayNumber: 1,
        }),
      });

      expect(res.status).toBe(200);
    });

    test('DELETE /api/v1/itineraries/:id/items/:itemId - Remove Item Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockRemoveItemFromItinerary.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}/items/${sampleItineraryItemProps.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    test('PATCH /api/v1/itineraries/:id/reorder - Reorder Items Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockReorderItineraryItems.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}/reorder`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            { id: sampleItineraryItemProps.id, dayNumber: 1, displayOrder: 2 },
          ],
        }),
      });

      expect(res.status).toBe(200);
    });

    test('POST /api/v1/itineraries/:id/publish - Publish Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockPublishItinerary.mockImplementation(() => Promise.resolve(itinerary));

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}/publish`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    test('POST /api/v1/itineraries/:id/archive - Archive Success', async () => {
      const itinerary = Itinerary.rehydrate(sampleItineraryProps);
      mockGetItinerary.mockImplementation(() => Promise.resolve(itinerary));
      mockArchiveItinerary.mockImplementation(() => Promise.resolve(itinerary));

      const res = await app.request(`/api/v1/itineraries/${itinerary.id}/archive`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });
    test('GET /api/v1/itineraries - non-admin without userId scopes to own itineraries', async () => {
      mockListItineraries.mockImplementation(() =>
        Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false })
      );

      const res = await app.request('/api/v1/itineraries', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const [callArgs] = mockListItineraries.mock.calls;
      // Must scope to caller's own createdBy — not leave it undefined
      expect(callArgs[0].filters?.createdBy).toBe('00000000-0000-0000-0000-000000000001');
      expect(callArgs[0].filters?.visibility).toBeUndefined();
    });

    test('GET /api/v1/itineraries?userId=other - non-admin viewing another user must see PUBLIC only', async () => {
      mockListItineraries.mockImplementation(() =>
        Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false })
      );

      const otherId = '00000000-0000-0000-0000-000000000099';
      const res = await app.request(`/api/v1/itineraries?userId=${otherId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const [callArgs] = mockListItineraries.mock.calls;
      expect(callArgs[0].filters?.createdBy).toBe(otherId);
      expect(callArgs[0].filters?.visibility).toBe('PUBLIC');
    });
  });
});

