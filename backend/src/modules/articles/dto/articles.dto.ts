import { slugify } from '@/common/utils/slug';
import { z } from 'zod';

export const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateArticleSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title must not be empty')
      .max(255, 'Title must not exceed 255 characters'),
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
    excerpt: z
      .string({ required_error: 'Excerpt is required' })
      .trim()
      .min(1, 'Excerpt must not be empty')
      .max(500, 'Excerpt must not exceed 500 characters'),
    content: z
      .string({ required_error: 'Content is required' })
      .min(1, 'Content must not be empty'),
    thumbnailId: z.string().uuid('Thumbnail ID must be a valid UUID').nullable().optional(),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .uuid('Category ID must be a valid UUID'),
    tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID')).optional(),
  })
  .strict();

export type CreateArticleRequestDto = z.infer<typeof CreateArticleSchema>;

export const UpdateArticleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(255, 'Title must not exceed 255 characters')
      .optional(),
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
    excerpt: z
      .string()
      .trim()
      .min(1, 'Excerpt must not be empty')
      .max(500, 'Excerpt must not exceed 500 characters')
      .optional(),
    content: z.string().min(1, 'Content must not be empty').optional(),
    thumbnailId: z.string().uuid('Thumbnail ID must be a valid UUID').nullable().optional(),
    categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
    tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID')).optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

export type UpdateArticleRequestDto = z.infer<typeof UpdateArticleSchema>;

export const SearchArticlesQuerySchema = z
  .object({
    keyword: z.string().trim().optional(),
    status: z.enum(['draft', 'under_review', 'published', 'archived']).optional(),
    categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
    tagId: z.string().uuid('Tag ID must be a valid UUID').optional(),
    authorId: z.string().uuid('Author ID must be a valid UUID').optional(),
    isFeatured: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, 'Page must be at least 1')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 20))
      .pipe(
        z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100')
      ),
    sort: z
      .enum(['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'title'])
      .optional()
      .default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .strict();

export type SearchArticlesQueryDto = z.infer<typeof SearchArticlesQuerySchema>;

export const ArticleIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type ArticleIdParamsDto = z.infer<typeof ArticleIdParamsSchema>;

export const ArticleSlugParamsSchema = z
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

export type ArticleSlugParamsDto = z.infer<typeof ArticleSlugParamsSchema>;

export const TagIdsSchema = z
  .object({
    tagIds: z
      .array(z.string().uuid('Tag ID must be a valid UUID'), {
        required_error: 'tagIds is required',
      })
      .min(1, 'tagIds must contain at least one tag ID'),
  })
  .strict();

export const BindTagsSchema = TagIdsSchema;
export type BindTagsDto = z.infer<typeof BindTagsSchema>;

export const RemoveTagsSchema = TagIdsSchema;
export type RemoveTagsDto = z.infer<typeof RemoveTagsSchema>;

export const RejectArticleSchema = z
  .object({
    reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
  })
  .strict();

export type RejectArticleDto = z.infer<typeof RejectArticleSchema>;

export interface ArticleResponseDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailId: string | null;
  authorId: string;
  categoryId: string;
  status: 'draft' | 'under_review' | 'published' | 'archived';
  viewCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleSummaryResponseDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  thumbnailId: string | null;
  authorId: string;
  categoryId: string;
  status: 'draft' | 'under_review' | 'published' | 'archived';
  viewCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResponseDto {
  data: ArticleSummaryResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
