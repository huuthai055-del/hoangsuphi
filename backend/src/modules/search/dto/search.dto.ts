import { ValidationError } from '@/common/errors/http.errors';
import { z } from 'zod';
import {
  SEARCH_ENTITY_TYPES,
  SEARCH_SORTS,
  type SearchEntityType,
  type SearchSort,
} from '../repository/search-read-model';

const ALL_ENTITY_TYPES = [...SEARCH_ENTITY_TYPES];
const PUBLIC_SORTS = SEARCH_SORTS;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MIN_RATING_PATTERN = /^(?:[1-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/;
const PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function canonicalizeDecimal(value: string): string {
  const [integerPart, fractionPart] = value.split('.');
  if (!fractionPart) return integerPart ?? value;
  const normalizedFraction = fractionPart.replace(/0+$/u, '');
  return normalizedFraction.length > 0
    ? `${integerPart}.${normalizedFraction}`
    : integerPart ?? value;
}

function normalizeQueryText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function canonicalizeEntityTypes(values: readonly SearchEntityType[]): SearchEntityType[] {
  const requested = new Set(values);
  return ALL_ENTITY_TYPES.filter((entityType) => requested.has(entityType));
}

function addIssue(context: z.RefinementCtx, path: string, message: string): void {
  context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
}

function addSchemaIssue(context: z.RefinementCtx, message: string): void {
  context.addIssue({ code: z.ZodIssueCode.custom, message });
}

const QueryTextSchema = z
  .string()
  .superRefine((value, context) => {
    if (CONTROL_CHARACTER_PATTERN.test(value)) {
      addSchemaIssue(context, 'Query must not contain control characters');
    }
  })
  .transform(normalizeQueryText)
  .refine((value) => Array.from(value).length >= 2, 'Query must contain at least 2 characters')
  .refine((value) => Array.from(value).length <= 200, 'Query must not exceed 200 characters');

const EntityTypesSchema = z
  .string()
  .superRefine((value, context) => {
    const tokens = value.split(',');
    if (tokens.length < 1 || tokens.length > 4) {
      addSchemaIssue(context, 'Types must contain between 1 and 4 values');
      return;
    }
    if (tokens.some((token) => token.length === 0)) {
      addSchemaIssue(context, 'Types must not contain empty values');
    }
    if (new Set(tokens).size !== tokens.length) {
      addSchemaIssue(context, 'Types must not contain duplicate values');
    }
    if (tokens.some((token) => !(SEARCH_ENTITY_TYPES as readonly string[]).includes(token))) {
      addSchemaIssue(context, `Types must be one or more of: ${SEARCH_ENTITY_TYPES.join(', ')}`);
    }
  })
  .transform((value) => canonicalizeEntityTypes(value.split(',') as SearchEntityType[]));

const CanonicalUuidSchema = z
  .string()
  .regex(UUID_PATTERN, 'Value must be a canonical lowercase UUID');

const BooleanLiteralSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const MinRatingSchema = z
  .string()
  .regex(MIN_RATING_PATTERN, 'Minimum rating must be a decimal from 1 to 5 with at most 2 decimals')
  .transform(canonicalizeDecimal);

const PriceSchema = z
  .string()
  .regex(PRICE_PATTERN, 'Price must be a non-negative NUMERIC(12,2) value')
  .transform(canonicalizeDecimal);

function priceToMinorUnits(value: string): bigint {
  const [integerPart = '0', fractionPart = ''] = value.split('.');
  return BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, '0'));
}

const AmenityIdsSchema = z
  .string()
  .superRefine((value, context) => {
    const tokens = value.split(',');
    if (tokens.length < 1 || tokens.length > 20) {
      addSchemaIssue(context, 'Amenity IDs must contain between 1 and 20 values');
      return;
    }
    if (tokens.some((token) => token.length === 0)) {
      addSchemaIssue(context, 'Amenity IDs must not contain empty values');
    }
    if (new Set(tokens).size !== tokens.length) {
      addSchemaIssue(context, 'Amenity IDs must not contain duplicate values');
    }
    if (tokens.some((token) => !UUID_PATTERN.test(token))) {
      addSchemaIssue(context, 'Every Amenity ID must be a canonical lowercase UUID');
    }
  })
  .transform((value) => [...value.split(',')].sort());

const LimitSchema = z
  .string()
  .regex(/^(?:[1-9]|[1-4][0-9]|50)$/u, 'Limit must be a base-10 integer from 1 to 50')
  .transform((value) => Number.parseInt(value, 10));

const CursorSchema = z
  .string()
  .min(1, 'Cursor must not be empty')
  .max(512, 'Cursor must not exceed 512 characters')
  .regex(BASE64URL_PATTERN, 'Cursor must be a base64url string');

const SearchQueryInputSchema = z
  .object({
    q: QueryTextSchema.optional(),
    types: EntityTypesSchema.optional(),
    regionId: CanonicalUuidSchema.optional(),
    includeDescendants: BooleanLiteralSchema.optional(),
    articleCategoryId: CanonicalUuidSchema.optional(),
    attractionCategoryId: CanonicalUuidSchema.optional(),
    businessTypeId: CanonicalUuidSchema.optional(),
    minRating: MinRatingSchema.optional(),
    priceMin: PriceSchema.optional(),
    priceMax: PriceSchema.optional(),
    amenityIds: AmenityIdsSchema.optional(),
    sort: z.enum(PUBLIC_SORTS).optional(),
    cursor: CursorSchema.optional(),
    limit: LimitSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.priceMin !== undefined &&
      value.priceMax !== undefined &&
      priceToMinorUnits(value.priceMax) < priceToMinorUnits(value.priceMin)
    ) {
      addIssue(context, 'priceMax', 'priceMax must be greater than or equal to priceMin');
    }
    if (
      (value.sort === 'price_asc' || value.sort === 'price_desc') &&
      value.types !== undefined &&
      !value.types.includes('business')
    ) {
      addIssue(context, 'sort', 'Price sorting requires Business in types');
    }
    if (value.includeDescendants !== undefined && value.regionId === undefined) {
      addIssue(context, 'includeDescendants', 'includeDescendants requires regionId');
    }
    if (value.sort === 'relevance' && value.q === undefined) {
      addIssue(context, 'sort', 'Relevance sorting requires q');
    }

    const hasCriterion =
      value.q !== undefined ||
      value.types !== undefined ||
      value.regionId !== undefined ||
      value.articleCategoryId !== undefined ||
      value.attractionCategoryId !== undefined ||
      value.businessTypeId !== undefined ||
      value.minRating !== undefined ||
      value.priceMin !== undefined ||
      value.priceMax !== undefined ||
      value.amenityIds !== undefined;
    if (!hasCriterion) {
      addIssue(context, 'query', 'At least one search criterion is required');
    }

    let eligible = new Set<SearchEntityType>(value.types ?? ALL_ENTITY_TYPES);
    const restrictTo = (allowed: readonly SearchEntityType[]): void => {
      const allowedSet = new Set<SearchEntityType>(allowed);
      eligible = new Set([...eligible].filter((entityType) => allowedSet.has(entityType)));
    };

    if (value.regionId !== undefined) restrictTo(['attraction', 'business', 'place']);
    if (value.articleCategoryId !== undefined) restrictTo(['article']);
    if (value.attractionCategoryId !== undefined) restrictTo(['attraction']);
    if (
      value.businessTypeId !== undefined ||
      value.priceMin !== undefined ||
      value.priceMax !== undefined ||
      value.amenityIds !== undefined
    ) {
      restrictTo(['business']);
    }
    if (eligible.size === 0) {
      addIssue(context, 'types', 'Types and entity-specific filters have no valid intersection');
    }
  })
  .transform((value) => {
    const q = value.q ?? null;
    const requestedSort = value.sort;
    const sort: SearchSort = requestedSort ?? (q === null ? 'newest' : 'relevance');

    return {
      q,
      types: value.types ?? [...ALL_ENTITY_TYPES],
      regionId: value.regionId ?? null,
      includeDescendants: value.regionId === undefined ? false : value.includeDescendants ?? true,
      articleCategoryId: value.articleCategoryId ?? null,
      attractionCategoryId: value.attractionCategoryId ?? null,
      businessTypeId: value.businessTypeId ?? null,
      minRating: value.minRating ?? null,
      priceMin: value.priceMin ?? null,
      priceMax: value.priceMax ?? null,
      amenityIds: value.amenityIds ?? [],
      sort,
      cursor: value.cursor ?? null,
      limit: value.limit ?? 20,
    };
  });

export const SearchQuerySchema = SearchQueryInputSchema;

export type SearchQueryDto = z.infer<typeof SearchQuerySchema>;

export const SearchRegionSchema = z
  .object({
    id: CanonicalUuidSchema,
    name: z.string(),
    slug: z.string(),
  })
  .strict();

export const SearchCategorySchema = z
  .object({
    id: CanonicalUuidSchema,
    code: z.string(),
    name: z.string(),
  })
  .strict();

const HttpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.toLowerCase().startsWith('https://'), 'URL must use HTTPS');

export const SearchResultSchema = z
  .object({
    entityType: z.enum(SEARCH_ENTITY_TYPES),
    id: CanonicalUuidSchema,
    name: z.string(),
    slug: z.string(),
    summary: z.string().max(500).nullable(),
    thumbnailUrl: HttpsUrlSchema.nullable(),
    region: SearchRegionSchema.nullable(),
    category: SearchCategorySchema.nullable(),
    rating: z.number().min(1).max(5).nullable(),
    priceMin: z
      .string()
      .regex(/^\d+(?:\.\d{1,2})?$/u)
      .nullable(),
    priceMax: z
      .string()
      .regex(/^\d+(?:\.\d{1,2})?$/u)
      .nullable(),
    relevance: z.number().finite().nonnegative().nullable(),
  })
  .strict();

export const SearchResponseSchema = z
  .object({
    data: z.array(SearchResultSchema).max(50),
    meta: z
      .object({
        cursor: CursorSchema.nullable(),
        nextCursor: CursorSchema.nullable(),
        hasMore: z.boolean(),
        totalReturned: z.number().int().min(0).max(50),
      })
      .strict(),
    error: z.null(),
  })
  .strict();

export type SearchRegionDto = z.infer<typeof SearchRegionSchema>;
export type SearchCategoryDto = z.infer<typeof SearchCategorySchema>;
export type SearchResultDto = z.infer<typeof SearchResultSchema>;
export type SearchResponseDto = z.infer<typeof SearchResponseSchema>;

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
export function parseSearchQuery(input: unknown): SearchQueryDto {
  const result = SearchQuerySchema.safeParse(normalizeRawQueryInput(input));
  if (!result.success) {
    throw new ValidationError('Invalid search parameters', toValidationDetails(result.error));
  }
  return result.data;
}
