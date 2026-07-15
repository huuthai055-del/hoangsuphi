import { describe, test, expect } from 'bun:test';
import { Notification } from './notification.entity';
import {
  InvalidNotificationStateError,
  ImmutableNotificationError,
  InvalidNotificationTitleError,
  InvalidNotificationMessageError,
  InvalidNotificationUserError,
} from './notification.errors';

describe('Notification Domain Entity', () => {
  test('should create notification with defaults', () => {
    const notification = Notification.create({
      id: 'notif-01',
      userId: 'user-01',
      title: 'New Article',
      message: 'A new article has been published',
    });

    expect(notification.id).toBe('notif-01');
    expect(notification.userId).toBe('user-01');
    expect(notification.title).toBe('New Article');
    expect(notification.message).toBe('A new article has been published');
    expect(notification.type).toBe('INFO');
    expect(notification.isRead).toBe(false);
    expect(notification.dismissedAt).toBeNull();
    expect(notification.deletedAt).toBeNull();
  });

  test('should throw on empty inputs', () => {
    expect(() =>
      Notification.create({ id: 'id', userId: 'user', title: '', message: 'msg' })
    ).toThrow(InvalidNotificationTitleError);

    expect(() =>
      Notification.create({ id: 'id', userId: 'user', title: 'title', message: '   ' })
    ).toThrow(InvalidNotificationMessageError);

    expect(() =>
      Notification.create({ id: 'id', userId: '  ', title: 'title', message: 'msg' })
    ).toThrow(InvalidNotificationUserError);
  });

  test('should mark as read and unread successfully', () => {
    const notification = Notification.create({
      id: 'notif-01',
      userId: 'user-01',
      title: 'Title',
      message: 'Msg',
    });

    notification.markAsRead();
    expect(notification.isRead).toBe(true);

    notification.markAsUnread();
    expect(notification.isRead).toBe(false);
  });

  test('should dismiss successfully and block further mutations (terminal state)', () => {
    const notification = Notification.create({
      id: 'notif-01',
      userId: 'user-01',
      title: 'Title',
      message: 'Msg',
    });

    notification.dismiss();
    expect(notification.dismissedAt).not.toBeNull();

    // Re-dismiss should throw
    expect(() => notification.dismiss()).toThrow(InvalidNotificationStateError);

    // Mutations on dismissed notification should throw
    expect(() => notification.markAsRead()).toThrow(InvalidNotificationStateError);
    expect(() => notification.markAsUnread()).toThrow(InvalidNotificationStateError);
  });

  test('should soft delete and block mutations', () => {
    const notification = Notification.create({
      id: 'notif-01',
      userId: 'user-01',
      title: 'Title',
      message: 'Msg',
    });

    notification.softDelete();
    expect(notification.deletedAt).not.toBeNull();

    // Mutations on deleted notification should throw
    expect(() => notification.markAsRead()).toThrow(ImmutableNotificationError);
    expect(() => notification.markAsUnread()).toThrow(ImmutableNotificationError);
    expect(() => notification.dismiss()).toThrow(ImmutableNotificationError);
  });

  test('should be idempotent for softDelete', () => {
    const list = Notification.create({
      id: 'notif-01',
      userId: 'user-01',
      title: 'Title',
      message: 'Msg',
    });

    const now1 = new Date('2025-01-01T00:00:00Z');
    const now2 = new Date('2025-06-01T00:00:00Z');

    list.softDelete(now1);
    const firstDeletedAt = list.deletedAt;

    list.softDelete(now2);
    expect(list.deletedAt).toEqual(firstDeletedAt);
  });

  test('should support equality comparison', () => {
    const n1 = Notification.rehydrate({
      id: 'notif-01',
      userId: 'user-01',
      title: 'T1',
      message: 'M1',
      type: 'INFO',
      isRead: false,
      dismissedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const n2 = Notification.rehydrate({
      id: 'notif-01',
      userId: 'user-02',
      title: 'T2',
      message: 'M2',
      type: 'SUCCESS',
      isRead: true,
      dismissedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    expect(n1.equals(n2)).toBe(true);
  });
});
