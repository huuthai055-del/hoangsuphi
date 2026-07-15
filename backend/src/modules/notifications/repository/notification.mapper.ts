import type { Notification, NotificationType } from '../domain/notification.entity';
import { Notification as NotificationClass } from '../domain/notification.entity';

export interface RawNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  dismissedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const NotificationMapper = {
  toDomain(raw: RawNotification): Notification {
    return NotificationClass.rehydrate({
      id: raw.id,
      userId: raw.userId,
      title: raw.title,
      message: raw.message,
      type: raw.type,
      isRead: raw.isRead,
      dismissedAt: raw.dismissedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(domain: Notification): RawNotification {
    return domain.toPersistence() as RawNotification;
  },
};
