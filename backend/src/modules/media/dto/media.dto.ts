import { z } from 'zod';

export const UploadMediaSchema = z
  .object({
    ownerType: z
      .string()
      .trim()
      .toUpperCase()
      .pipe(z.enum(['ARTICLE', 'PLACE', 'BUSINESS', 'ATTRACTION', 'USER']))
      .optional()
      .nullable(),
    ownerId: z.string().trim().uuid('Owner ID must be a valid UUID').optional().nullable(),
  })
  .strict();

export type UploadMediaDto = z.infer<typeof UploadMediaSchema>;

export const MediaIdParamsSchema = z
  .object({
    id: z.string().trim().uuid('ID must be a valid UUID'),
  })
  .strict();

export type MediaIdParamsDto = z.infer<typeof MediaIdParamsSchema>;

export interface MediaVariantResponseDto {
  variantType: string;
  storageKey: string;
  url: string;
  width: number | null;
  height: number | null;
  fileSize: number;
}

export interface MediaResponseDto {
  id: string;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  mediaType: string;
  fileSize: number;
  hash: string;
  status: string;
  ownerType: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}
