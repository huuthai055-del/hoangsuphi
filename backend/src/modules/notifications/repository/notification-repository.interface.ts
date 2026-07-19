import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';
import type { Notification, NotificationType } from '../domain/notification.entity';

export type NotificationSortField = 'createdAt' | 'title' | 'type' | 'isRead';

export interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  type?: NotificationType;
  search?: string;
}

export interface INotificationRepository {
  findById(id: string, tx?: unknown): Promise<Notification | null>;
  create(notification: Notification, tx?: unknown): Promise<void>;
  update(notification: Notification, tx?: unknown): Promise<void>;
  delete(notification: Notification, tx?: unknown): Promise<void>;
  exists(id: string, tx?: unknown): Promise<boolean>;
  findByUser(
    userId: string,
    pagination?: PaginationOptions,
    tx?: unknown
  ): Promise<PaginatedResult<Notification>>;
  findMany(
    options: {
      filters?: NotificationFilters;
      pagination?: PaginationOptions;
      sort?: { field: NotificationSortField; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Notification>>;
  count(filters?: NotificationFilters, tx?: unknown): Promise<number>;
}
