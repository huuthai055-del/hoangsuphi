import { z } from 'zod';

export const NotificationTypeSchema = z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']);

export const NotificationIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type NotificationIdParamsDto = z.infer<typeof NotificationIdParamsSchema>;

export const CreateNotificationRequestSchema = z
  .object({
    userId: z.string().trim().uuid('User ID must be a valid UUID'),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title must not be empty')
      .max(255, 'Title must not exceed 255 characters'),
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(1, 'Message must not be empty')
      .max(2000, 'Message must not exceed 2000 characters'),
    type: NotificationTypeSchema.optional(),
  })
  .strict();

export type CreateNotificationRequestDto = z.infer<typeof CreateNotificationRequestSchema>;

export const NotificationFilterQuerySchema = z
  .object({
    userId: z.string().trim().uuid().optional(),
    isRead: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
      .pipe(z.boolean().optional()),
    type: NotificationTypeSchema.optional(),
    search: z.string().trim().max(100).optional(),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 0))
      .pipe(z.number().int().min(0)),
  })
  .strict();

export type NotificationFilterQueryDto = z.infer<typeof NotificationFilterQuerySchema>;

export interface NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
