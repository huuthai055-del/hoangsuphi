import { z } from 'zod';

export const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateCategorySchema = z
  .object({
    code: z
      .string({ required_error: 'Category code is required' })
      .trim()
      .min(1, 'Category code must not be empty')
      .max(50, 'Category code must not exceed 50 characters')
      .regex(
        SEO_SLUG_REGEX,
        'Category code must be a valid SEO slug format (lowercase alphanumeric and single dashes)'
      ),
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(1, 'Category name must not be empty')
      .max(100, 'Category name must not exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' || val === undefined ? null : val)),
  })
  .strict();

export type CreateCategoryRequestDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name must not be empty')
      .max(100, 'Category name must not exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' || val === undefined ? null : val)),
  })
  .strict();

export type UpdateCategoryRequestDto = z.infer<typeof UpdateCategorySchema>;

export const CategoryIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type CategoryIdParamsDto = z.infer<typeof CategoryIdParamsSchema>;

export const CategoryCodeParamsSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Category code must not be empty')
      .regex(
        SEO_SLUG_REGEX,
        'Category code must be a valid SEO slug format (lowercase alphanumeric and single dashes)'
      ),
  })
  .strict();

export type CategoryCodeParamsDto = z.infer<typeof CategoryCodeParamsSchema>;

export interface CategoryResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
