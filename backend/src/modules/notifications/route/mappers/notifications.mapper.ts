import type { Notification } from '../../domain/notification.entity';
import type { NotificationResponseDto } from '../../dto/notifications.dto';

export function mapNotificationToResponse(notif: Notification): NotificationResponseDto {
  return {
    id: notif.id,
    userId: notif.userId,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    isRead: notif.isRead,
    dismissedAt: notif.dismissedAt ? notif.dismissedAt.toISOString() : null,
    createdAt: notif.createdAt.toISOString(),
    updatedAt: notif.updatedAt.toISOString(),
  };
}
