import { ValidationError } from '@/common/errors/http.errors';
import { z } from 'zod';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const RecommendationStrategySchema = z.enum(['nearby', 'same_region', 'top_rated', 'newest']);
export type RecommendationStrategy = z.infer<typeof RecommendationStrategySchema>;

const SourceTypeSchema = z.enum(['place', 'business', 'attraction']);
export type RecommendationSourceType = z.infer<typeof SourceTypeSchema>;

const LimitSchema = z
  .string()
  .regex(/^[1-9]\d*$/u, 'Limit must be a base-10 integer')
  .transform((value) => Number.parseInt(value, 10))
  .refine((val) => val >= 1 && val <= 12, 'Limit must be between 1 and 12');

export const RecommendationsQuerySchema = z
  .object({
    strategy: RecommendationStrategySchema,
    sourceType: SourceTypeSchema.optional(),
    sourceId: z.string().regex(UUID_PATTERN, 'Value must be a canonical lowercase UUID').optional(),
    limit: LimitSchema.optional().default('6'),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.strategy === 'nearby' || val.strategy === 'same_region') {
      if (!val.sourceType || !val.sourceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'sourceType and sourceId are required for nearby and same_region strategies',
          path: ['query'],
        });
      }
    } else if (val.strategy === 'top_rated' || val.strategy === 'newest') {
      if (val.sourceType !== undefined || val.sourceId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'sourceType and sourceId must not be provided for top_rated and newest strategies',
          path: ['query'],
        });
      }
    }
  });

export type RecommendationsQueryDto = z.infer<typeof RecommendationsQuerySchema>;

function toValidationDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      for (const key of issue.keys) details[key] = 'Unknown query parameter';
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
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    normalized[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
  }
  return normalized;
}

/** Parse URLSearchParams or a raw query map while rejecting repeated query keys. */
export function parseRecommendationsQuery(input: unknown): RecommendationsQueryDto {
  const result = RecommendationsQuerySchema.safeParse(normalizeRawQueryInput(input));
  if (!result.success) {
    throw new ValidationError('Invalid recommendation parameters', toValidationDetails(result.error));
  }
  return result.data;
}

// ---------------- RESPONSE ENVELOPE ----------------

export const RecommendationRegionSchema = z
  .object({
    id: z.string().regex(UUID_PATTERN),
    name: z.string(),
    slug: z.string(),
  })
  .strict();

export const RecommendationRatingSchema = z
  .object({
    average: z.number().min(1).max(5).nullable(),
    count: z.number().int().min(0),
  })
  .strict();

export const RecommendationItemSchema = z
  .object({
    entityType: z.enum(['ARTICLE', 'PLACE', 'BUSINESS', 'ATTRACTION']),
    id: z.string().regex(UUID_PATTERN),
    name: z.string(),
    slug: z.string(),
    url: z.string(),
    thumbnailUrl: z.string().nullable(),
    region: RecommendationRegionSchema.nullable(),
    rating: RecommendationRatingSchema,
    distanceMeters: z.number().nullable(),
  })
  .strict();

export type RecommendationItemDto = z.infer<typeof RecommendationItemSchema>;

export const RecommendationsResponseSchema = z
  .object({
    data: z.array(RecommendationItemSchema),
    meta: z
      .object({
        strategy: RecommendationStrategySchema,
        limit: z.number().int(),
        source: z
          .object({
            type: SourceTypeSchema,
            id: z.string().regex(UUID_PATTERN),
          })
          .nullable(),
      })
      .strict(),
    error: z.null(),
  })
  .strict();

export type RecommendationsResponseDto = z.infer<typeof RecommendationsResponseSchema>;
