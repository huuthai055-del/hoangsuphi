import { slugify } from '@/common/utils/slug';
import { z } from 'zod';

// ==========================================
// REQUEST SCHEMAS & DTOs
// ==========================================

export const CreatePlaceSchema = z
  .object({
    regionId: z
      .string({ required_error: 'Region ID is required' })
      .uuid('Region ID must be a valid UUID'),
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

export type CreatePlaceRequestDto = z.infer<typeof CreatePlaceSchema>;

export const UpdatePlaceSchema = z
  .object({
    regionId: z.string().uuid('Region ID must be a valid UUID').optional(),
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

export type UpdatePlaceRequestDto = z.infer<typeof UpdatePlaceSchema>;

export const ListPlacesQuerySchema = z
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
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict();

export type ListPlacesQueryDto = z.infer<typeof ListPlacesQuerySchema>;

export const PlaceNearbyQuerySchema = z
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

export type PlaceNearbyQueryDto = z.infer<typeof PlaceNearbyQuerySchema>;

export const PlaceIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type PlaceIdParamsDto = z.infer<typeof PlaceIdParamsSchema>;

export const PlaceSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug must not be empty')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single dashes'),
  })
  .strict();

export type PlaceSlugParamsDto = z.infer<typeof PlaceSlugParamsSchema>;

// ==========================================
// RESPONSE DTOs
// ==========================================

export interface PlaceResponseDto {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  description: string | null;
  coverUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PlaceSummaryResponseDto {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  coverUrl: string | null;
  status: 'active' | 'inactive';
}

export interface PlaceListResponseDto {
  data: PlaceResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
