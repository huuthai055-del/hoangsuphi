import { z } from 'zod';

export const TopListStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const TopListIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type TopListIdParamsDto = z.infer<typeof TopListIdParamsSchema>;

export const TopListItemIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
    itemId: z.string().trim().uuid('Item ID must be a valid UUID'),
  })
  .strict();

export type TopListItemIdParamsDto = z.infer<typeof TopListItemIdParamsSchema>;

export const CreateTopListRequestSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title must not be empty')
      .max(255, 'Title must not exceed 255 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    slug: z
      .string({ required_error: 'Slug is required' })
      .trim()
      .min(1, 'Slug must not be empty')
      .max(100, 'Slug must not exceed 100 characters')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must consist of lowercase letters, numbers, and single hyphens (no consecutive or leading/trailing hyphens)'
      ),
    category: z.string().trim().max(100).optional().nullable(),
    featured: z.boolean().optional(),
  })
  .strict();

export type CreateTopListRequestDto = z.infer<typeof CreateTopListRequestSchema>;

export const UpdateTopListRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(255, 'Title must not exceed 255 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    featured: z.boolean().optional(),
  })
  .strict();

export type UpdateTopListRequestDto = z.infer<typeof UpdateTopListRequestSchema>;

export const AddTopListItemRequestSchema = z
  .object({
    ownerType: z.enum(['PLACE', 'BUSINESS', 'ATTRACTION']),
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID'),
  })
  .strict();

export type AddTopListItemRequestDto = z.infer<typeof AddTopListItemRequestSchema>;

export const ReorderTopListItemsRequestSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().trim().uuid('Item ID must be a valid UUID'),
          displayOrder: z.number().int().min(1, 'Display order must be at least 1'),
        })
      )
      .min(1, 'Reorder list must contain at least one item'),
  })
  .strict();

export type ReorderTopListItemsRequestDto = z.infer<typeof ReorderTopListItemsRequestSchema>;

export const TopListFilterQuerySchema = z
  .object({
    category: z.string().trim().optional(),
    status: TopListStatusSchema.optional(),
    featured: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
      .pipe(z.boolean().optional()),
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

export type TopListFilterQueryDto = z.infer<typeof TopListFilterQuerySchema>;

export interface TopListItemResponseDto {
  id: string;
  topListId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ATTRACTION';
  ownerId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopListResponseDto {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  category: string | null;
  featured: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: TopListItemResponseDto[];
}
