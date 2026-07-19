import { ValidationError } from '@/common/errors/http.errors';
import { z } from 'zod';
import type { HarvestStage } from '../repository/harvest-status.repository.interface';

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const limitSchema = z
  .string()
  .regex(/^[1-9]\d*$/u, 'Limit must be a base-10 integer')
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value >= 1 && value <= 50, 'Limit must be between 1 and 50');

export const HarvestPublicQuerySchema = z
  .object({
    limit: limitSchema.optional().default('20'),
    cursor: z
      .string()
      .min(1, 'Cursor must not be empty')
      .max(768, 'Cursor must not exceed 768 characters')
      .regex(BASE64URL_PATTERN, 'Cursor must be a valid base64url string')
      .optional(),
  })
  .strict();

export const HarvestRegionParamsSchema = z
  .object({
    slug: z
      .string()
      .min(1, 'Slug must not be empty')
      .max(120, 'Slug must not exceed 120 characters')
      .regex(PUBLIC_SLUG_PATTERN, 'Slug must use lowercase ASCII kebab-case'),
  })
  .strict();

export type HarvestPublicQuery = z.infer<typeof HarvestPublicQuerySchema>;

function normalizeRawQueryInput(input: unknown): unknown {
  if (input instanceof URLSearchParams) {
    const grouped: Record<string, string | string[]> = {};
    for (const key of new Set(input.keys())) {
      const values = input.getAll(key);
      grouped[key] = values.length === 1 ? values[0] ?? '' : values;
    }
    return grouped;
  }
  return input;
}

function toValidationDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      for (const key of issue.keys) details[key] = 'Unknown query parameter';
      continue;
    }
    details[String(issue.path[0] ?? 'query')] ??= issue.message;
  }
  return details;
}

export function parseHarvestPublicQuery(input: unknown): HarvestPublicQuery {
  const parsed = HarvestPublicQuerySchema.safeParse(normalizeRawQueryInput(input));
  if (!parsed.success) {
    throw new ValidationError('Invalid Harvest Status query', toValidationDetails(parsed.error));
  }
  return parsed.data;
}

export interface HarvestPublicRegionDto {
  id: string;
  name: string;
  slug: string;
  level: number;
}

export interface HarvestPublicMediaDto {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  variant: string;
}

export interface HarvestPublicUpdateDto {
  id: string;
  stage: HarvestStage;
  observedAt: string;
  title: string;
  summary: string;
  advisory: string | null;
  publishedAt: string;
  media: HarvestPublicMediaDto[];
}

export interface HarvestPaginationDto {
  nextCursor: string | null;
  hasNextPage: boolean;
}
