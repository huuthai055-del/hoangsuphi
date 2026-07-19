import { Roles } from '@/common/constants/roles';
import type { AppEnv } from '@/common/types/app-env';
import type { Context } from 'hono';
import type {
  CreateNotificationRequestDto,
  NotificationFilterQueryDto,
  NotificationIdParamsDto,
} from '../dto/notifications.dto';
import type { NotificationService } from '../service/notification.service';
import { mapNotificationToResponse } from './mappers/notifications.mapper';

export class NotificationsController {
  constructor(private readonly service: NotificationService) {}

  public create = async (c: Context<AppEnv>): Promise<Response> => {
    const body = c.get('validBody') as CreateNotificationRequestDto;

    const notif = await this.service.createNotification({
      userId: body.userId,
      title: body.title,
      message: body.message,
      type: body.type,
    });

    return c.json(mapNotificationToResponse(notif), 201);
  };

  public getById = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const params = c.get('validParams') as NotificationIdParamsDto;

    const notif = await this.service.findOne(params.id, user);
    return c.json(mapNotificationToResponse(notif), 200);
  };

  public markRead = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const params = c.get('validParams') as NotificationIdParamsDto;

    const updated = await this.service.markRead(params.id, user);
    return c.json(mapNotificationToResponse(updated), 200);
  };

  public markUnread = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const params = c.get('validParams') as NotificationIdParamsDto;

    const updated = await this.service.markUnread(params.id, user);
    return c.json(mapNotificationToResponse(updated), 200);
  };

  public dismiss = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const params = c.get('validParams') as NotificationIdParamsDto;

    const updated = await this.service.dismiss(params.id, user);
    return c.json(mapNotificationToResponse(updated), 200);
  };

  public delete = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const params = c.get('validParams') as NotificationIdParamsDto;

    await this.service.delete(params.id, user);
    return c.body(null, 204);
  };

  public list = async (c: Context<AppEnv>): Promise<Response> => {
    const user = c.get('user');
    const query = c.get('validQuery') as NotificationFilterQueryDto;

    // Enforce userId query condition (IDOR protection)
    const roles = user.roles || [];
    let targetUserId = user.id;
    if (roles.includes(Roles.ADMIN) && query.userId) {
      targetUserId = query.userId;
    }

    const result = await this.service.findMany({
      filters: {
        userId: targetUserId,
        isRead: query.isRead,
        type: query.type,
        search: query.search,
      },
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    });

    const mapped = result.items.map(mapNotificationToResponse);

    return c.json(
      {
        data: mapped,
        meta: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
        },
      },
      200
    );
  };
}
