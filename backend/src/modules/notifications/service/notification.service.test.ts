import { expect, test, describe, mock, beforeEach } from 'bun:test';
import { NotificationService } from './notification.service';
import type { INotificationRepository } from '../repository/notification-repository.interface';
import { Notification } from '../domain/notification.entity';
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';

describe('NotificationService', () => {
  let service: NotificationService;

  const sampleRawNotification = {
    id: 'notif-01',
    userId: 'user-01',
    title: 'New Article',
    message: 'Hello world',
    type: 'INFO' as const,
    isRead: false,
    dismissedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleUser = { id: 'user-01', roles: [] as string[] };
  const foreignUser = { id: 'user-99', roles: [] as string[] };
  const adminUser = { id: 'admin-01', roles: ['admin'] };

  const mockFindById = mock(() => Promise.resolve(null as any));
  const mockCreate = mock(() => Promise.resolve());
  const mockUpdate = mock(() => Promise.resolve());
  const mockDelete = mock(() => Promise.resolve());
  const mockExists = mock(() => Promise.resolve(false));
  const mockFindMany = mock(() => Promise.resolve({ items: [], total: 0 } as any));
  const mockCount = mock(() => Promise.resolve(0));
  const mockFindByUser = mock(() => Promise.resolve({ items: [], total: 0 } as any));

  const mockRepo: INotificationRepository = {
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    exists: mockExists,
    findMany: mockFindMany,
    count: mockCount,
    findByUser: mockFindByUser,
  };

  beforeEach(() => {
    service = new NotificationService(mockRepo);
    mockFindById.mockImplementation(() => Promise.resolve(null as any));
    mockCreate.mockImplementation(() => Promise.resolve());
    mockUpdate.mockImplementation(() => Promise.resolve());
    mockDelete.mockImplementation(() => Promise.resolve());
    mockFindById.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
  });

  describe('createNotification()', () => {
    test('should create notification and persist', async () => {
      const notif = await service.createNotification({
        userId: 'user-01',
        title: 'Title',
        message: 'Message body',
      });

      expect(notif.isRead).toBe(false);
      expect(notif.title).toBe('Title');
      expect(mockCreate).toHaveBeenCalled();
    });

    test('should throw ValidationError on empty title', async () => {
      await expect(
        service.createNotification({ userId: 'user-01', title: '', message: 'Msg' })
      ).rejects.toThrow(ValidationError);
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      mockCreate.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('Dup')));
      await expect(
        service.createNotification({ userId: 'user-01', title: 'T', message: 'M' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('markRead() & markUnread()', () => {
    test('should mark notification as read successfully', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      const updated = await service.markRead('notif-01', sampleUser);
      expect(updated.isRead).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw AuthorizationError if non-owner tries to mark as read', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      await expect(service.markRead('notif-01', foreignUser)).rejects.toThrow(AuthorizationError);
    });

    test('should allow admin to mark as read even if non-owner', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      const updated = await service.markRead('notif-01', adminUser);
      expect(updated.isRead).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should mark notification as unread successfully', async () => {
      const notif = Notification.rehydrate({ ...sampleRawNotification, isRead: true });
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      const updated = await service.markUnread('notif-01', sampleUser);
      expect(updated.isRead).toBe(false);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw NotFoundError if notification not found', async () => {
      await expect(service.markRead('missing', sampleUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('dismiss()', () => {
    test('should dismiss notification', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      const updated = await service.dismiss('notif-01', sampleUser);
      expect(updated.dismissedAt).not.toBeNull();
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw ValidationError on double dismiss via aggregate rules', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      await service.dismiss('notif-01', sampleUser);
      await expect(service.dismiss('notif-01', sampleUser)).rejects.toThrow(ValidationError);
    });
  });

  describe('delete()', () => {
    test('should soft delete notification', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      await service.delete('notif-01', sampleUser);
      expect(notif.deletedAt).not.toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('findOne()', () => {
    test('should return notification if found', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      const result = await service.findOne('notif-01', sampleUser);
      expect(result.id).toBe('notif-01');
    });

    test('should throw AuthorizationError if non-owner tries to findOne', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockFindById.mockImplementation(() => Promise.resolve(notif));

      await expect(service.findOne('notif-01', foreignUser)).rejects.toThrow(AuthorizationError);
    });
  });
});
