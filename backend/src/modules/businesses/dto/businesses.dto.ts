import { slugify } from '@/common/utils/slug';
import { z } from 'zod';

const MoneySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u, 'Price must be a non-negative NUMERIC(12,2) value')
  .transform((value) => {
    const [integerPart = '0', fractionPart = ''] = value.split('.');
    const normalizedFraction = fractionPart.replace(/0+$/u, '');
    return normalizedFraction.length > 0 ? `${integerPart}.${normalizedFraction}` : integerPart;
  });

function priceToMinorUnits(value: string): bigint {
  const [integerPart = '0', fractionPart = ''] = value.split('.');
  return BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, '0'));
}

function validatePriceRange(
  value: { priceMin?: string | null; priceMax?: string | null },
  context: z.RefinementCtx
): void {
  const hasMin = value.priceMin !== undefined;
  const hasMax = value.priceMax !== undefined;
  if (hasMin !== hasMax) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasMin ? 'priceMax' : 'priceMin'],
      message: 'Price minimum and maximum must be provided together',
    });
    return;
  }
  if (!hasMin || value.priceMin === null || value.priceMax === null) {
    if (value.priceMin !== value.priceMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceMax'],
        message: 'Price minimum and maximum must both be null when clearing the range',
      });
    }
    return;
  }
  if (value.priceMin === undefined || value.priceMax === undefined) return;
  if (priceToMinorUnits(value.priceMax) < priceToMinorUnits(value.priceMin)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['priceMax'],
      message: 'Price maximum must be greater than or equal to minimum',
    });
  }
}

// ==========================================
// REQUEST SCHEMAS & DTOs
// ==========================================

export const CreateBusinessSchema = z
  .object({
    regionId: z
      .string({ required_error: 'Region ID is required' })
      .uuid('Region ID must be a valid UUID'),
    businessTypeId: z
      .string({ required_error: 'Business Type ID is required' })
      .uuid('Business Type ID must be a valid UUID'),
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
    priceMin: MoneySchema.nullable().optional(),
    priceMax: MoneySchema.nullable().optional(),
    amenityIds: z.array(z.string().uuid('Amenity ID must be a valid UUID')).default([]),
  })
  .strict()
  .superRefine(validatePriceRange);

export type CreateBusinessRequestDto = z.infer<typeof CreateBusinessSchema>;

export const UpdateBusinessSchema = z
  .object({
    regionId: z.string().uuid('Region ID must be a valid UUID').optional(),
    businessTypeId: z.string().uuid('Business Type ID must be a valid UUID').optional(),
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
    priceMin: MoneySchema.nullable().optional(),
    priceMax: MoneySchema.nullable().optional(),
    amenityIds: z.array(z.string().uuid('Amenity ID must be a valid UUID')).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict()
  .superRefine(validatePriceRange);

export type UpdateBusinessRequestDto = z.infer<typeof UpdateBusinessSchema>;

export const ListBusinessesQuerySchema = z
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
    businessTypeId: z.string().uuid('Business Type ID must be a valid UUID').optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict();

export type ListBusinessesQueryDto = z.infer<typeof ListBusinessesQuerySchema>;

export const BusinessNearbyQuerySchema = z
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

export type BusinessNearbyQueryDto = z.infer<typeof BusinessNearbyQuerySchema>;

export const BusinessIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type BusinessIdParamsDto = z.infer<typeof BusinessIdParamsSchema>;

export const BusinessSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug must not be empty')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single dashes'),
  })
  .strict();

export type BusinessSlugParamsDto = z.infer<typeof BusinessSlugParamsSchema>;

// ==========================================
// RESPONSE DTOs
// ==========================================

export interface BusinessResponseDto {
  id: string;
  regionId: string;
  businessTypeId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  description: string | null;
  coverUrl: string | null;
  priceMin: string | null;
  priceMax: string | null;
  status: 'active' | 'inactive';
  amenityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSummaryResponseDto {
  id: string;
  regionId: string;
  businessTypeId: string;
  name: string;
  slug: string;
  location: { lng: number; lat: number };
  coverUrl: string | null;
  priceMin: string | null;
  priceMax: string | null;
  status: 'active' | 'inactive';
  amenityIds: string[];
}

export interface BusinessListResponseDto {
  data: BusinessResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
