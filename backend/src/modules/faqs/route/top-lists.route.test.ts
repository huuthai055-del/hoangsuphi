import { expect, test, describe, beforeEach, mock } from 'bun:test';
import type { Hono } from 'hono';
import { TopList } from '../domain/top-list.entity';
import { TopListItem } from '../domain/top-list-item.entity';
import { TopListsController } from './top-lists.controller';
import { container } from '@/common/di/container';

describe('Top Lists API Routing & Controller', () => {
  let app: Hono;

  const mockCreateTopList = mock(() => Promise.resolve({} as any));
  const mockUpdateTopList = mock(() => Promise.resolve({} as any));
  const mockPublishTopList = mock(() => Promise.resolve({} as any));
  const mockArchiveTopList = mock(() => Promise.resolve({} as any));
  const mockDeleteTopList = mock(() => Promise.resolve());
  const mockAddItemToTopList = mock(() => Promise.resolve({} as any));
  const mockRemoveItemFromTopList = mock(() => Promise.resolve());
  const mockReorderTopListItems = mock(() => Promise.resolve());
  const mockGetTopList = mock(() => Promise.resolve({} as any));
  const mockListTopLists = mock(() => Promise.resolve({ items: [], total: 0 } as any));

  const mockTopListService = {
    createTopList: mockCreateTopList,
    updateTopList: mockUpdateTopList,
    publishTopList: mockPublishTopList,
    archiveTopList: mockArchiveTopList,
    deleteTopList: mockDeleteTopList,
    addItemToTopList: mockAddItemToTopList,
    removeItemFromTopList: mockRemoveItemFromTopList,
    reorderTopListItems: mockReorderTopListItems,
    getTopList: mockGetTopList,
    listTopLists: mockListTopLists,
  };

  const mockController = new TopListsController(mockTopListService as any);

  const sampleTopListProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    title: 'Top 10 Attractions',
    description: 'The best places to visit',
    slug: 'top-10-attractions',
    category: 'Sightseeing',
    featured: true,
    status: 'DRAFT' as const,
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [],
  };

  const sampleTopListItemProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55705',
    topListId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    container.reset();
    container.register('TopListsController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockCreateTopList.mockClear();
    mockUpdateTopList.mockClear();
    mockPublishTopList.mockClear();
    mockArchiveTopList.mockClear();
    mockDeleteTopList.mockClear();
    mockAddItemToTopList.mockClear();
    mockRemoveItemFromTopList.mockClear();
    mockReorderTopListItems.mockClear();
    mockGetTopList.mockClear();
    mockListTopLists.mockClear();
  });

  describe('Top List Route integrations', () => {
    test('POST /api/v1/top-lists - Create Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockCreateTopList.mockImplementation(() => Promise.resolve(topList));

      const res = await app.request('/api/v1/top-lists', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Top 10 Attractions',
          description: 'The best places to visit',
          slug: 'top-10-attractions',
          category: 'Sightseeing',
          featured: true,
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(topList.id);
      expect(json.slug).toBe(topList.slug);
    });

    test('POST /api/v1/top-lists - Validation 400', async () => {
      const res = await app.request('/api/v1/top-lists', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '',
          slug: 'Invalid Slug!',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });

    test('PATCH /api/v1/top-lists/:id - Update Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      const updated = TopList.rehydrate({ ...sampleTopListProps, title: 'Updated Title' });
      mockUpdateTopList.mockImplementation(() => Promise.resolve(updated));

      const res = await app.request(`/api/v1/top-lists/${topList.id}`, {
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

    test('GET /api/v1/top-lists/:id - Get Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockGetTopList.mockImplementation(() => Promise.resolve(topList));

      const res = await app.request(`/api/v1/top-lists/${topList.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(topList.id);
    });

    test('DELETE /api/v1/top-lists/:id - Delete Success', async () => {
      mockDeleteTopList.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/top-lists/${sampleTopListProps.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
    });

    test('POST /api/v1/top-lists/:id/items - Add Item Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      const item = TopListItem.rehydrate(sampleTopListItemProps);
      mockGetTopList.mockImplementation(() => Promise.resolve(topList));
      mockAddItemToTopList.mockImplementation(() => Promise.resolve(item));

      const res = await app.request(`/api/v1/top-lists/${topList.id}/items`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerType: 'PLACE',
          ownerId: sampleTopListItemProps.ownerId,
        }),
      });

      expect(res.status).toBe(200);
    });

    test('DELETE /api/v1/top-lists/:id/items/:itemId - Remove Item Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockGetTopList.mockImplementation(() => Promise.resolve(topList));
      mockRemoveItemFromTopList.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/top-lists/${topList.id}/items/${sampleTopListItemProps.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    test('PATCH /api/v1/top-lists/:id/reorder - Reorder Items Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockGetTopList.mockImplementation(() => Promise.resolve(topList));
      mockReorderTopListItems.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/top-lists/${topList.id}/reorder`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            { id: sampleTopListItemProps.id, displayOrder: 2 },
          ],
        }),
      });

      expect(res.status).toBe(200);
    });

    test('POST /api/v1/top-lists/:id/publish - Publish Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockPublishTopList.mockImplementation(() => Promise.resolve(topList));

      const res = await app.request(`/api/v1/top-lists/${topList.id}/publish`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    test('POST /api/v1/top-lists/:id/archive - Archive Success', async () => {
      const topList = TopList.rehydrate(sampleTopListProps);
      mockArchiveTopList.mockImplementation(() => Promise.resolve(topList));

      const res = await app.request(`/api/v1/top-lists/${topList.id}/archive`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });
  });
});
