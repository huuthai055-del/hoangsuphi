import { z } from 'zod';

// ==========================================
// REQUEST SCHEMAS & DTOs
// ==========================================

export const CreateRegionSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must not exceed 100 characters'),
    slug: z
      .string({ required_error: 'Slug is required' })
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        'Slug must contain only lowercase alphanumeric characters and single dashes'
      ),
    parentId: z.string().uuid('Parent ID must be a valid UUID').nullable().optional(),
    level: z
      .number({ required_error: 'Level is required' })
      .int('Level must be an integer')
      .min(1, 'Level must be at least 1')
      .max(5, 'Level must not exceed 5'),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    center: z
      .object({
        lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180),
        lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90),
      })
      .strict()
      .nullable()
      .optional(),
    description: z.string().trim().nullable().optional(),
    coverImage: z.string().trim().url('Cover image must be a valid URL').nullable().optional(),
    gallery: z.array(z.string().url('Each gallery item must be a valid URL')).optional(),
  })
  .strict();

export type CreateRegionRequestDto = z.infer<typeof CreateRegionSchema>;

export const UpdateRegionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),
    parentId: z.string().uuid('Parent ID must be a valid UUID').nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    center: z
      .object({
        lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180),
        lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90),
      })
      .strict()
      .nullable()
      .optional(),
    description: z.string().trim().nullable().optional(),
    coverImage: z.string().trim().url('Cover image must be a valid URL').nullable().optional(),
    gallery: z.array(z.string().url('Each gallery item must be a valid URL')).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict();

export type UpdateRegionRequestDto = z.infer<typeof UpdateRegionSchema>;

export const ListRegionsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, 'Page must be greater than or equal to 1')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 20))
      .pipe(
        z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100')
      ),
    parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
    level: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : undefined))
      .pipe(z.number().int().min(1).max(5).optional()),
    sort: z.enum(['name', 'level', 'createdAt']).optional().default('name'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .strict();

export type ListRegionsQueryDto = z.infer<typeof ListRegionsQuerySchema>;

export const RegionIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type RegionIdParamsDto = z.infer<typeof RegionIdParamsSchema>;

export const RegionSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug must not be empty')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single dashes'),
  })
  .strict();

export type RegionSlugParamsDto = z.infer<typeof RegionSlugParamsSchema>;

// ==========================================
// RESPONSE DTOs
// ==========================================

export interface RegionResponseDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  level: number;
  path: string;
  latitude: number | null;
  longitude: number | null;
  center: { lng: number; lat: number } | null;
  description: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface RegionSummaryResponseDto {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
}

export interface RegionListResponseDto {
  data: RegionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
