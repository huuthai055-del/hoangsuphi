import { z } from 'zod';
import { REDIRECT_STATUS_CODES } from '../domain/redirect.entity';

const RedirectStatusCodeSchema = z.union([
  z.literal(REDIRECT_STATUS_CODES[0]),
  z.literal(REDIRECT_STATUS_CODES[1]),
]);

export const RedirectIdParamsSchema = z.object({
  id: z.string().uuid('Invalid redirect ID format'),
}).strict();

export const CreateRedirectSchema = z.object({
  sourcePath: z.string().min(1).max(500),
  targetPath: z.string().min(1).max(500),
  statusCode: RedirectStatusCodeSchema.optional(),
  isActive: z.boolean().optional(),
}).strict();

export const UpdateRedirectSchema = z.object({
  sourcePath: z.string().min(1).max(500).optional(),
  targetPath: z.string().min(1).max(500).optional(),
  statusCode: RedirectStatusCodeSchema.optional(),
  isActive: z.boolean().optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const ListRedirectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().min(1).max(512).optional(),
}).strict();

export const ResolveRedirectQuerySchema = z.object({
  path: z.string().min(1).max(500),
}).strict();

export type CreateRedirectDto = z.infer<typeof CreateRedirectSchema>;
export type UpdateRedirectDto = z.infer<typeof UpdateRedirectSchema>;
export type ListRedirectsQueryDto = z.infer<typeof ListRedirectsQuerySchema>;
export type ResolveRedirectQueryDto = z.infer<typeof ResolveRedirectQuerySchema>;
