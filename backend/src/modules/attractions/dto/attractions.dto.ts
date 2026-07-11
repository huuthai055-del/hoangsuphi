import { z } from 'zod';
import { slugify } from '@/common/utils/slug';

// ==========================================
// REQUEST SCHEMAS & DTOs
// ==========================================

export const CreateAttractionSchema = z
  .object({
    regionId: z
      .string({ required_error: 'Region ID is required' })
      .uuid('Region ID must be a valid UUID'),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .uuid('Category ID must be a valid UUID'),
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must not exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .transform((val) => slugify(val))
      .pipe(
        z
          .string()
          .regex(
            /^[a-z0-9]+(-[a-z0-9]+)*$/,
            'Slug must contain only lowercase alphanumeric characters and single dashes'
          )
      )
      .optional(),
    location: z
      .object(
        {
          lng: z
            .number()
            .min(-180, 'Longitude must be between -180 and 180')
            .max(180, 'Longitude must be between -180 and 180'),
          lat: z
            .number()
            .min(-90, 'Latitude must be between -90 and 90')
            .max(90, 'Latitude must be between -90 and 90'),
        },
        { required_error: 'Location is required' }
      )
      .strict(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .nullable()
      .optional(),
    coverUrl: z
      .string()
      .trim()
      .url('Cover URL must be a valid URL')
      .max(512, 'Cover URL must not exceed 512 characters')
      .nullable()
      .optional(),
  })
  .strict();

export type CreateAttractionRequestDto = z.infer<typeof CreateAttractionSchema>;

export const UpdateAttractionSchema = z
  .object({
    regionId: z.string().uuid('Region ID must be a valid UUID').optional(),
    categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
    name: z
      .string()
      .trim()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .transform((val) => slugify(val))
      .pipe(
        z
          .string()
          .regex(
            /^[a-z0-9]+(-[a-z0-9]+)*$/,
            'Slug must contain only lowercase alphanumeric characters and single dashes'
          )
      )
      .optional(),
    location: z
      .object({
        lng: z
          .number()
          .min(-180, 'Longitude must be between -180 and 180')
          .max(180, 'Longitude must be between -180 and 180'),
        lat: z
          .number()
          .min(-90, 'Latitude must be between -90 and 90')
          .max(90, 'Latitude must be between -90 and 90'),
      })
      .strict()
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .nullable()
      .optional(),
    coverUrl: z
      .string()
      .trim()
      .url('Cover URL must be a valid URL')
      .max(512, 'Cover URL must not exceed 512 characters')
      .nullable()
      .optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict();

export type UpdateAttractionRequestDto = z.infer<typeof UpdateAttractionSchema>;

export const ListAttractionsQuerySchema = z
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
    regionId: z.string().uuid('Region ID must be a valid UUID').optional(),
    categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict();

export type ListAttractionsQueryDto = z.infer<typeof ListAttractionsQuerySchema>;

export const AttractionNearbyQuerySchema = z
  .object({
    lng: z
      .string({ required_error: 'Longitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-180, 'Longitude must be between -180 and 180').max(180)),
    lat: z
      .string({ required_error: 'Latitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-90, 'Latitude must be between -90 and 90').max(90)),
    radius: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseFloat(val) : 5000))
      .pipe(z.number().positive('Radius must be a positive number')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1).max(100)),
  })
  .strict();

export type AttractionNearbyQueryDto = z.infer<typeof AttractionNearbyQuerySchema>;

export const AttractionIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type AttractionIdParamsDto = z.infer<typeof AttractionIdParamsSchema>;

export const AttractionSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug must not be empty')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single dashes'),
  })
  .strict();

export type AttractionSlugParamsDto = z.infer<typeof AttractionSlugParamsSchema>;

// ==========================================
// RESPONSE DTOs
// ==========================================

export interface AttractionResponseDto {
  id: string;
  regionId: string;
  categoryId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  description: string | null;
  coverUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AttractionSummaryResponseDto {
  id: string;
  regionId: string;
  categoryId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  coverUrl: string | null;
  status: 'active' | 'inactive';
}

export interface AttractionListResponseDto {
  data: AttractionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
