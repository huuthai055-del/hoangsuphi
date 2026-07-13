import { z } from 'zod';

export const ItineraryVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export const ItineraryStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const ItineraryIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type ItineraryIdParamsDto = z.infer<typeof ItineraryIdParamsSchema>;

export const ItineraryItemIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
    itemId: z.string().trim().uuid('Item ID must be a valid UUID'),
  })
  .strict();

export type ItineraryItemIdParamsDto = z.infer<typeof ItineraryItemIdParamsSchema>;

export const CreateItineraryRequestSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title must not be empty')
      .max(100, 'Title must not exceed 100 characters'),
    description: z.string().trim().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
    visibility: ItineraryVisibilitySchema.optional(),
  })
  .strict();

export type CreateItineraryRequestDto = z.infer<typeof CreateItineraryRequestSchema>;

export const UpdateItineraryRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(100, 'Title must not exceed 100 characters')
      .optional(),
    description: z.string().trim().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
    visibility: ItineraryVisibilitySchema.optional(),
  })
  .strict();

export type UpdateItineraryRequestDto = z.infer<typeof UpdateItineraryRequestSchema>;

export const AddItineraryItemRequestSchema = z
  .object({
    ownerType: z.enum(['PLACE', 'BUSINESS', 'ATTRACTION']),
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID'),
    dayNumber: z.number().int().min(1, 'Day number must be at least 1'),
  })
  .strict();

export type AddItineraryItemRequestDto = z.infer<typeof AddItineraryItemRequestSchema>;

export const ReorderItineraryItemsRequestSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.string().trim().uuid('Item ID must be a valid UUID'),
        dayNumber: z.number().int().min(1, 'Day number must be at least 1'),
        displayOrder: z.number().int().min(1, 'Display order must be at least 1'),
      })
    ).min(1, 'Reorder list must contain at least one item'),
  })
  .strict();

export type ReorderItineraryItemsRequestDto = z.infer<typeof ReorderItineraryItemsRequestSchema>;

export const ItineraryFilterQuerySchema = z
  .object({
    userId: z.string().trim().uuid().optional(),
    visibility: ItineraryVisibilitySchema.optional(),
    status: ItineraryStatusSchema.optional(),
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

export type ItineraryFilterQueryDto = z.infer<typeof ItineraryFilterQuerySchema>;

export interface ItineraryItemResponseDto {
  id: string;
  topListId?: string; // for TopLists, but for Itineraries it will be itineraryId
  itineraryId?: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ATTRACTION';
  ownerId: string;
  dayNumber: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryResponseDto {
  id: string;
  title: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: ItineraryItemResponseDto[];
}
