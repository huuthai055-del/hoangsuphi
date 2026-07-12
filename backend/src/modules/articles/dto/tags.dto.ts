import { z } from 'zod';
import { slugify } from '@/common/utils/slug';

export const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateTagSchema = z
  .object({
    name: z
      .string({ required_error: 'Tag name is required' })
      .trim()
      .min(1, 'Tag name must not be empty')
      .max(100, 'Tag name must not exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .transform((val) => {
        const res = slugify(val);
        return res === '' ? undefined : res;
      })
      .pipe(
        z
          .string()
          .regex(
            SEO_SLUG_REGEX,
            'Slug must be a valid SEO slug format (lowercase alphanumeric and single dashes)'
          )
          .optional()
      )
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' || val === undefined ? null : val)),
    isFeatured: z.boolean().optional().default(false),
  })
  .strict();

export type CreateTagRequestDto = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tag name must not be empty')
      .max(100, 'Tag name must not exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' || val === undefined ? null : val)),
    isFeatured: z.boolean().optional(),
  })
  .strict();

export type UpdateTagRequestDto = z.infer<typeof UpdateTagSchema>;

export const TagIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type TagIdParamsDto = z.infer<typeof TagIdParamsSchema>;

export const TagSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug must not be empty')
      .regex(
        SEO_SLUG_REGEX,
        'Slug must be a valid SEO slug format (lowercase alphanumeric and single dashes)'
      ),
  })
  .strict();

export type TagSlugParamsDto = z.infer<typeof TagSlugParamsSchema>;

export const ListTagsQuerySchema = z
  .object({
    isFeatured: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
  })
  .strict();

export type ListTagsQueryDto = z.infer<typeof ListTagsQuerySchema>;

export const SearchTagsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, 'Search query must not exceed 100 characters')
      .optional()
      .default(''),
  })
  .strict();

export type SearchTagsQueryDto = z.infer<typeof SearchTagsQuerySchema>;

export interface TagResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}
