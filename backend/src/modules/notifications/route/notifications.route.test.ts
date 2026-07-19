import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import { Notification } from '../domain/notification.entity';
import { NotificationsController } from './notifications.controller';

describe('Notifications API Routing & Controller', () => {
  let app: Hono;

  const mockCreateNotification = mock(() => Promise.resolve({} as any));
  const mockMarkRead = mock(() => Promise.resolve({} as any));
  const mockMarkUnread = mock(() => Promise.resolve({} as any));
  const mockDismiss = mock(() => Promise.resolve({} as any));
  const mockDelete = mock(() => Promise.resolve());
  const mockFindOne = mock(() => Promise.resolve({} as any));
  const mockFindMany = mock(() => Promise.resolve({ items: [], total: 0 } as any));

  const mockNotificationService = {
    createNotification: mockCreateNotification,
    markRead: mockMarkRead,
    markUnread: mockMarkUnread,
    dismiss: mockDismiss,
    delete: mockDelete,
    findOne: mockFindOne,
    findMany: mockFindMany,
  };

  const mockController = new NotificationsController(mockNotificationService as any);

  const sampleNotificationProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    userId: '00000000-0000-0000-0000-000000000001',
    title: 'New Notification',
    message: 'Hello system notification',
    type: 'INFO' as const,
    isRead: false,
    dismissedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    container.reset();
    container.register('NotificationsController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockCreateNotification.mockClear();
    mockMarkRead.mockClear();
    mockMarkUnread.mockClear();
    mockDismiss.mockClear();
    mockDelete.mockClear();
    mockFindOne.mockClear();
    mockFindMany.mockClear();
  });

  describe('Notifications Route integrations', () => {
    test('POST /api/v1/notifications - Create Success', async () => {
      const notif = Notification.rehydrate(sampleNotificationProps);
      mockCreateNotification.mockImplementation(() => Promise.resolve(notif));

      const res = await app.request('/api/v1/notifications', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sampleNotificationProps.userId,
          title: 'New Notification',
          message: 'Hello system notification',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(notif.id);
      expect(json.title).toBe(notif.title);
    });

    test('GET /api/v1/notifications/:id - Get Success', async () => {
      const notif = Notification.rehydrate(sampleNotificationProps);
      mockFindOne.mockImplementation(() => Promise.resolve(notif));

      const res = await app.request(`/api/v1/notifications/${notif.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(notif.id);
    });

    test('PATCH /api/v1/notifications/:id/read - Mark Read Success', async () => {
      const notif = Notification.rehydrate(sampleNotificationProps);
      mockFindOne.mockImplementation(() => Promise.resolve(notif));
      mockMarkRead.mockImplementation(() =>
        Promise.resolve(Notification.rehydrate({ ...sampleNotificationProps, isRead: true }))
      );

      const res = await app.request(`/api/v1/notifications/${notif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.isRead).toBe(true);
    });

    test('PATCH /api/v1/notifications/:id/unread - Mark Unread Success', async () => {
      const notif = Notification.rehydrate({ ...sampleNotificationProps, isRead: true });
      mockFindOne.mockImplementation(() => Promise.resolve(notif));
      mockMarkUnread.mockImplementation(() =>
        Promise.resolve(Notification.rehydrate(sampleNotificationProps))
      );

      const res = await app.request(`/api/v1/notifications/${notif.id}/unread`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.isRead).toBe(false);
    });

    test('PATCH /api/v1/notifications/:id/dismiss - Dismiss Success', async () => {
      const notif = Notification.rehydrate(sampleNotificationProps);
      mockFindOne.mockImplementation(() => Promise.resolve(notif));
      mockDismiss.mockImplementation(() =>
        Promise.resolve(
          Notification.rehydrate({ ...sampleNotificationProps, dismissedAt: new Date() })
        )
      );

      const res = await app.request(`/api/v1/notifications/${notif.id}/dismiss`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.dismissedAt).not.toBeNull();
    });

    test('DELETE /api/v1/notifications/:id - Delete Success', async () => {
      const notif = Notification.rehydrate(sampleNotificationProps);
      mockFindOne.mockImplementation(() => Promise.resolve(notif));
      mockDelete.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/notifications/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
    });
  });
});
