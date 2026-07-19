import { z } from 'zod';

export const UploadMediaSchema = z
  .object({
    altText: z
      .string()
      .trim()
      .max(255, 'altText must be at most 255 characters')
      .optional()
      .nullable(),
    caption: z
      .string()
      .trim()
      .max(500, 'caption must be at most 500 characters')
      .optional()
      .nullable(),
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
  url: string;
  width: number | null;
  height: number | null;
  fileSize: number;
}

export interface MediaResponseDto {
  id: string;
  url: string;
  mimeType: string;
  mediaType: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  variants: MediaVariantResponseDto[];
  createdAt: string;
}
