import {
  CheckConstraintViolationRepositoryError,
  ConstraintViolationRepositoryError,
  DatabaseOperationRepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  NotNullViolationRepositoryError,
  RepositoryError,
  TransactionConflictRepositoryError,
} from '@/common/errors/repository.errors';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';
import { type TransactionClient, db } from '@/lib/database/client';
import { notifications as notificationsSchema } from '@/lib/database/schema/notifications';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Notification } from '../domain/notification.entity';
import type {
  INotificationRepository,
  NotificationFilters,
  NotificationSortField,
} from './notification-repository.interface';
import { NotificationMapper, type RawNotification } from './notification.mapper';

function mapDbError(err: unknown, operation: string, details?: Record<string, unknown>): never {
  if (err instanceof RepositoryError) throw err;
  const pgErr = err as { code?: string; constraint?: string; column?: string };
  switch (pgErr.code) {
    case '23505':
      throw new DuplicateKeyRepositoryError(
        `${operation} failed: unique constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '23503':
      throw new ConstraintViolationRepositoryError(
        `${operation} failed: foreign key constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '23502':
      throw new NotNullViolationRepositoryError(
        `${operation} failed: not-null constraint violated`,
        { column: pgErr.column, ...details },
        err as Error
      );
    case '23514':
      throw new CheckConstraintViolationRepositoryError(
        `${operation} failed: check constraint violated`,
        { constraint: pgErr.constraint, ...details },
        err as Error
      );
    case '40001':
    case '40P01':
      throw new TransactionConflictRepositoryError(
        `${operation} failed: transaction conflict`,
        details,
        err as Error
      );
    default:
      throw new DatabaseOperationRepositoryError(
        `${operation} failed: raw database error`,
        details,
        err as Error
      );
  }
}

export class DrizzleNotificationRepository implements INotificationRepository {
  private getClient(tx?: unknown) {
    return (tx as TransactionClient) ?? db;
  }

  private buildConditions(filters?: NotificationFilters): SQL[] {
    const conditions: SQL[] = [isNull(notificationsSchema.deletedAt)];

    if (filters) {
      const { userId, isRead, type, search } = filters;
      if (userId) {
        conditions.push(eq(notificationsSchema.userId, userId));
      }
      if (isRead !== undefined) {
        conditions.push(eq(notificationsSchema.isRead, isRead));
      }
      if (type) {
        conditions.push(eq(notificationsSchema.type, type));
      }
      if (search) {
        const cleanSearch = `%${search
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_')}%`;
        conditions.push(
          sql`(${notificationsSchema.title} ILIKE ${cleanSearch} ESCAPE '\\' OR ${notificationsSchema.message} ILIKE ${cleanSearch} ESCAPE '\\')`
        );
      }
    }

    return conditions;
  }

  public async findById(id: string, tx?: unknown): Promise<Notification | null> {
    try {
      const [raw] = await this.getClient(tx)
        .select()
        .from(notificationsSchema)
        .where(and(eq(notificationsSchema.id, id), isNull(notificationsSchema.deletedAt)));

      return raw ? NotificationMapper.toDomain(raw as RawNotification) : null;
    } catch (err) {
      mapDbError(err, 'findById', { id });
    }
  }

  public async create(notification: Notification, tx?: unknown): Promise<void> {
    try {
      await this.getClient(tx)
        .insert(notificationsSchema)
        .values(NotificationMapper.toPersistence(notification));
    } catch (err) {
      mapDbError(err, 'create', { id: notification.id });
    }
  }

  public async update(notification: Notification, tx?: unknown): Promise<void> {
    try {
      const raw = NotificationMapper.toPersistence(notification);
      const [updated] = await this.getClient(tx)
        .update(notificationsSchema)
        .set({
          title: raw.title,
          message: raw.message,
          type: raw.type,
          isRead: raw.isRead,
          dismissedAt: raw.dismissedAt,
          updatedAt: raw.updatedAt,
        })
        .where(
          and(eq(notificationsSchema.id, notification.id), isNull(notificationsSchema.deletedAt))
        )
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(
          `Notification not found for update with ID: ${notification.id}`
        );
      }
    } catch (err) {
      mapDbError(err, 'update', { id: notification.id });
    }
  }

  public async delete(notification: Notification, tx?: unknown): Promise<void> {
    try {
      const [updated] = await this.getClient(tx)
        .update(notificationsSchema)
        .set({
          deletedAt: notification.deletedAt,
          updatedAt: notification.updatedAt,
        })
        .where(
          and(eq(notificationsSchema.id, notification.id), isNull(notificationsSchema.deletedAt))
        )
        .returning();

      if (!updated) {
        throw new EntityNotFoundRepositoryError(
          `Notification not found for deletion with ID: ${notification.id}`
        );
      }
    } catch (err) {
      mapDbError(err, 'delete', { id: notification.id });
    }
  }

  public async exists(id: string, tx?: unknown): Promise<boolean> {
    try {
      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(*)` })
        .from(notificationsSchema)
        .where(and(eq(notificationsSchema.id, id), isNull(notificationsSchema.deletedAt)));
      return row?.count ? Number.parseInt(row.count, 10) > 0 : false;
    } catch (err) {
      mapDbError(err, 'exists', { id });
    }
  }

  public async findByUser(
    userId: string,
    pagination?: PaginationOptions,
    tx?: unknown
  ): Promise<PaginatedResult<Notification>> {
    return this.findMany(
      {
        filters: { userId },
        pagination,
        sort: { field: 'createdAt', order: 'desc' },
      },
      tx
    );
  }

  public async findMany(
    options: {
      filters?: NotificationFilters;
      pagination?: PaginationOptions;
      sort?: { field: NotificationSortField; order: 'asc' | 'desc' };
    },
    tx?: unknown
  ): Promise<PaginatedResult<Notification>> {
    try {
      const client = this.getClient(tx);
      const conditions = this.buildConditions(options.filters);

      const [countRow] = await client
        .select({ count: sql<string>`count(*)` })
        .from(notificationsSchema)
        .where(and(...conditions));
      const total = countRow?.count ? Number.parseInt(countRow.count, 10) : 0;

      const limit = options.pagination?.limit ?? 10;
      const offset = options.pagination?.offset ?? 0;

      const query = client
        .select()
        .from(notificationsSchema)
        .where(and(...conditions))
        .$dynamic();

      if (options.sort) {
        const orderFn = options.sort.order === 'asc' ? asc : desc;
        switch (options.sort.field) {
          case 'title':
            query.orderBy(orderFn(notificationsSchema.title));
            break;
          case 'type':
            query.orderBy(orderFn(notificationsSchema.type));
            break;
          case 'isRead':
            query.orderBy(orderFn(notificationsSchema.isRead));
            break;
          default:
            query.orderBy(orderFn(notificationsSchema.createdAt));
            break;
        }
      } else {
        query.orderBy(desc(notificationsSchema.createdAt));
      }

      query.limit(limit).offset(offset);
      const rows = await query;

      const items = rows.map((row) => NotificationMapper.toDomain(row as RawNotification));
      const totalPages = Math.ceil(total / limit);
      const page = Math.floor(offset / limit) + 1;

      return {
        items,
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0,
      };
    } catch (err) {
      mapDbError(err, 'findMany', options);
    }
  }

  public async count(filters?: NotificationFilters, tx?: unknown): Promise<number> {
    try {
      const conditions = this.buildConditions(filters);
      const [row] = await this.getClient(tx)
        .select({ count: sql<string>`count(*)` })
        .from(notificationsSchema)
        .where(and(...conditions));
      return row?.count ? Number.parseInt(row.count, 10) : 0;
    } catch (err) {
      mapDbError(err, 'count', filters ? { ...filters } : undefined);
    }
  }
}
