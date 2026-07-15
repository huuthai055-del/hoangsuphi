import { ValidationError } from '@/common/errors/http.errors';
import { z } from 'zod';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const STRICT_DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const ALLOWED_PUBLIC_TYPES = ['place', 'attraction', 'business', 'utility'] as const;

function toValidationDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      for (const key of issue.keys) {
        details[key] = 'Unknown query parameter';
      }
      continue;
    }
    const field = String(issue.path[0] ?? 'query');
    details[field] ??= issue.message;
  }
  return details;
}

function normalizeRawQueryInput(input: unknown): unknown {
  if (input instanceof URLSearchParams) {
    const grouped: Record<string, string | string[]> = {};
    for (const key of new Set(input.keys())) {
      const values = input.getAll(key);
      grouped[key] = values.length === 1 ? values[0] ?? '' : values;
    }
    return grouped;
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    normalized[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
  }
  return normalized;
}

const TypesSchema = z
  .string()
  .min(1, 'Types must not be empty')
  .superRefine((val, ctx) => {
    if (val.startsWith(',') || val.endsWith(',') || val.includes(',,')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Types must not contain empty elements or leading/trailing commas',
      });
      return;
    }
    const parts = val.split(',');
    const seen = new Set<string>();
    for (const part of parts) {
      if (!(ALLOWED_PUBLIC_TYPES as readonly string[]).includes(part)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown entity type: ${part}`,
        });
        return;
      }
      if (seen.has(part)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Types must not contain duplicate values',
        });
        return;
      }
      seen.add(part);
    }
  })
  .transform((val) => val.split(','));

const RadiusSchema = z
  .string()
  .min(1, 'Radius must not be empty')
  .regex(/^\d+$/, 'Radius must be a base-10 integer')
  .transform((val) => Number.parseInt(val, 10));

const LimitSchema = z
  .string()
  .min(1, 'Limit must not be empty')
  .regex(/^\d+$/, 'Limit must be a base-10 integer')
  .transform((val) => Number.parseInt(val, 10));

const MinRatingSchema = z
  .string()
  .min(1, 'minRating must not be empty')
  .regex(STRICT_DECIMAL_PATTERN, 'minRating must be a valid decimal string')
  .refine((val) => !val.toLowerCase().includes('e'), 'Scientific notation is not allowed');

export const nearbySearchQuerySchema = z
  .object({
    lat: z
      .string()
      .min(1, 'lat must not be empty')
      .regex(STRICT_DECIMAL_PATTERN, 'lat must be a valid decimal string')
      .refine((val) => !val.toLowerCase().includes('e'), 'Scientific notation is not allowed'),
    lng: z
      .string()
      .min(1, 'lng must not be empty')
      .regex(STRICT_DECIMAL_PATTERN, 'lng must be a valid decimal string')
      .refine((val) => !val.toLowerCase().includes('e'), 'Scientific notation is not allowed'),
    radius: RadiusSchema.optional(),
    types: TypesSchema.optional(),
    regionId: z.string().regex(UUID_PATTERN, 'regionId must be a valid lowercase UUID').optional(),
    categoryId: z
      .string()
      .regex(UUID_PATTERN, 'categoryId must be a valid lowercase UUID')
      .optional(),
    minRating: MinRatingSchema.optional(),
    limit: LimitSchema.optional(),
    cursor: z
      .string()
      .min(1, 'Cursor must not be empty')
      .max(512, 'Cursor must not exceed 512 characters')
      .regex(BASE64URL_PATTERN, 'Cursor must be a valid base64url string')
      .optional(),
  })
  .strict();

export type NearbySearchQueryDto = z.infer<typeof nearbySearchQuerySchema>;

export function parseNearbyQuery(input: unknown): NearbySearchQueryDto {
  const result = nearbySearchQuerySchema.safeParse(normalizeRawQueryInput(input));
  if (!result.success) {
    throw new ValidationError('Invalid search parameters', toValidationDetails(result.error));
  }
  return result.data;
}
