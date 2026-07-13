import type { Notification, NotificationType } from '../domain/notification.entity';
import { Notification as NotificationClass } from '../domain/notification.entity';
import type {
  INotificationRepository,
  NotificationFilters,
  NotificationSortField,
} from '../repository/notification-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '@/common/errors/http.errors';
import { Roles } from '@/common/constants/roles';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import {
  NotificationDomainError,
  InvalidNotificationTitleError,
  InvalidNotificationMessageError,
  InvalidNotificationUserError,
  InvalidNotificationStateError,
  ImmutableNotificationError,
} from '../domain/notification.errors';
import { runInTransaction } from '@/lib/database/client';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: Notification already exists', { cause: err });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof InvalidNotificationTitleError) {
    return new ValidationError({ title: err.message });
  }
  if (err instanceof InvalidNotificationMessageError) {
    return new ValidationError({ message: err.message });
  }
  if (err instanceof InvalidNotificationUserError) {
    return new ValidationError({ userId: err.message });
  }
  if (err instanceof InvalidNotificationStateError || err instanceof ImmutableNotificationError) {
    return new ValidationError({ state: err.message });
  }
  if (err instanceof NotificationDomainError) {
    return new ValidationError({ notification: err.message });
  }
  return err;
}

export class NotificationService {
  constructor(private readonly repo: INotificationRepository) {}

  private async loadNotificationOrThrow(id: string, tx?: unknown): Promise<Notification> {
    const notif = await this.repo.findById(id, tx);
    if (!notif) {
      throw new NotFoundError(`Notification not found with ID: ${id}`);
    }
    return notif;
  }

  private assertAccess(notif: Notification, user: { id: string; roles: string[] }): void {
    const roles = user.roles || [];
    if (notif.userId !== user.id && !roles.includes(Roles.ADMIN)) {
      throw new AuthorizationError('You do not have permission to access this notification');
    }
  }

  public async createNotification(input: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    now?: Date;
  }): Promise<Notification> {
    try {
      return await runInTransaction(async (tx) => {
        const notif = NotificationClass.create({
          id: generateUuidV7(),
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type,
          now: input.now,
        });
        await this.repo.create(notif, tx);
        return notif;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async markRead(id: string, user: { id: string; roles: string[] }, now?: Date): Promise<Notification> {
    try {
      return await runInTransaction(async (tx) => {
        const notif = await this.loadNotificationOrThrow(id, tx);
        this.assertAccess(notif, user);
        notif.markAsRead(now);
        await this.repo.update(notif, tx);
        return notif;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async markUnread(id: string, user: { id: string; roles: string[] }, now?: Date): Promise<Notification> {
    try {
      return await runInTransaction(async (tx) => {
        const notif = await this.loadNotificationOrThrow(id, tx);
        this.assertAccess(notif, user);
        notif.markAsUnread(now);
        await this.repo.update(notif, tx);
        return notif;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async dismiss(id: string, user: { id: string; roles: string[] }, now?: Date): Promise<Notification> {
    try {
      return await runInTransaction(async (tx) => {
        const notif = await this.loadNotificationOrThrow(id, tx);
        this.assertAccess(notif, user);
        notif.dismiss(now);
        await this.repo.update(notif, tx);
        return notif;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async delete(id: string, user: { id: string; roles: string[] }, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const notif = await this.loadNotificationOrThrow(id, tx);
        this.assertAccess(notif, user);
        notif.softDelete(now);
        await this.repo.delete(notif, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async findOne(id: string, user: { id: string; roles: string[] }): Promise<Notification> {
    const notif = await this.loadNotificationOrThrow(id);
    this.assertAccess(notif, user);
    return notif;
  }

  public async findMany(options: {
    filters?: NotificationFilters;
    pagination?: PaginationOptions;
    sort?: { field: NotificationSortField; order: 'asc' | 'desc' };
  }): Promise<PaginatedResult<Notification>> {
    return this.repo.findMany(options);
  }

  public async count(filters?: NotificationFilters): Promise<number> {
    return this.repo.count(filters);
  }
}
