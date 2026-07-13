import { z } from 'zod';

export const OwnerTypeSchema = z.enum(['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION']);

export const ReviewIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type ReviewIdParamsDto = z.infer<typeof ReviewIdParamsSchema>;

export const FavoriteIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type FavoriteIdParamsDto = z.infer<typeof FavoriteIdParamsSchema>;

export const OwnerParamsSchema = z
  .object({
    ownerType: OwnerTypeSchema,
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID'),
  })
  .strict();

export type OwnerParamsDto = z.infer<typeof OwnerParamsSchema>;

export const CreateReviewRequestSchema = z
  .object({
    ownerType: OwnerTypeSchema,
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID'),
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title must not be empty')
      .max(100, 'Title must not exceed 100 characters'),
    content: z
      .string({ required_error: 'Content is required' })
      .trim()
      .min(1, 'Content must not be empty')
      .max(1000, 'Content must not exceed 1000 characters'),
  })
  .strict();

export type CreateReviewRequestDto = z.infer<typeof CreateReviewRequestSchema>;

export const UpdateReviewRequestSchema = z
  .object({
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5')
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(100, 'Title must not exceed 100 characters')
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, 'Content must not be empty')
      .max(1000, 'Content must not exceed 1000 characters')
      .optional(),
  })
  .strict();

export type UpdateReviewRequestDto = z.infer<typeof UpdateReviewRequestSchema>;

export const ApproveReviewRequestSchema = z.object({}).strict();
export type ApproveReviewRequestDto = z.infer<typeof ApproveReviewRequestSchema>;

export const RejectReviewRequestSchema = z.object({}).strict();
export type RejectReviewRequestDto = z.infer<typeof RejectReviewRequestSchema>;

export const CreateFavoriteRequestSchema = z
  .object({
    ownerType: OwnerTypeSchema,
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID'),
  })
  .strict();

export type CreateFavoriteRequestDto = z.infer<typeof CreateFavoriteRequestSchema>;

// Queries validation
export const PaginationQuerySchema = z
  .object({
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

export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

export const SearchQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'Search query must not exceed 100 characters').optional(),
  })
  .strict();

export type SearchQueryDto = z.infer<typeof SearchQuerySchema>;

export const UserIdParamsSchema = z
  .object({
    userId: z.string().trim().uuid('User ID must be a valid UUID'),
  })
  .strict();

export type UserIdParamsDto = z.infer<typeof UserIdParamsSchema>;

export const ReviewFilterQuerySchema = z
  .object({
    ownerType: OwnerTypeSchema.optional(),
    ownerId: z.string().trim().uuid().optional(),
    userId: z.string().trim().uuid().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    rating: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : undefined))
      .pipe(z.number().int().min(1).max(5).optional()),
  })
  .strict();

export type ReviewFilterQueryDto = z.infer<typeof ReviewFilterQuerySchema>;

export const FavoriteFilterQuerySchema = z
  .object({
    ownerType: OwnerTypeSchema.optional(),
    ownerId: z.string().trim().uuid().optional(),
    userId: z.string().trim().uuid().optional(),
  })
  .strict();

export type FavoriteFilterQueryDto = z.infer<typeof FavoriteFilterQuerySchema>;

export interface ReviewResponseDto {
  id: string;
  userId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ARTICLE' | 'ATTRACTION';
  ownerId: string;
  rating: number;
  title: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteResponseDto {
  id: string;
  userId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ARTICLE' | 'ATTRACTION';
  ownerId: string;
  createdAt: string;
}
