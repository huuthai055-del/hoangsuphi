import { z } from 'zod';

export const FaqStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const FaqIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type FaqIdParamsDto = z.infer<typeof FaqIdParamsSchema>;

export const CreateFaqRequestSchema = z
  .object({
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(1, 'Question must not be empty')
      .max(255, 'Question must not exceed 255 characters'),
    answer: z
      .string({ required_error: 'Answer is required' })
      .trim()
      .min(1, 'Answer must not be empty')
      .max(5000, 'Answer must not exceed 5000 characters'),
    category: z.string().trim().max(100).optional().nullable(),
    displayOrder: z.number().int().min(1).optional(),
  })
  .strict();

export type CreateFaqRequestDto = z.infer<typeof CreateFaqRequestSchema>;

export const UpdateFaqRequestSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, 'Question must not be empty')
      .max(255, 'Question must not exceed 255 characters')
      .optional(),
    answer: z
      .string()
      .trim()
      .min(1, 'Answer must not be empty')
      .max(5000, 'Answer must not exceed 5000 characters')
      .optional(),
    category: z.string().trim().max(100).optional().nullable(),
    displayOrder: z.number().int().min(1).optional(),
  })
  .strict();

export type UpdateFaqRequestDto = z.infer<typeof UpdateFaqRequestSchema>;

export const FaqFilterQuerySchema = z
  .object({
    category: z.string().trim().optional(),
    status: FaqStatusSchema.optional(),
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

export type FaqFilterQueryDto = z.infer<typeof FaqFilterQuerySchema>;

export interface FaqResponseDto {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
