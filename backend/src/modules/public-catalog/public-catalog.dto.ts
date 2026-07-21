import { ValidationError } from '@/common/errors/http.errors';
import { z } from 'zod';
import type {
  PublicCatalogKind,
  PublicCatalogListQuery,
  PublicCatalogSort,
  PublicReferenceKind,
} from './public-catalog.types';
import { PUBLIC_CATALOG_KINDS, PUBLIC_REFERENCE_KINDS } from './public-catalog.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

const SlugSchema = z
  .string()
  .min(1, 'Slug must not be empty')
  .max(255, 'Slug must not exceed 255 characters')
  .regex(SLUG_PATTERN, 'Slug must use lowercase ASCII kebab-case');

const LimitSchema = z
  .string()
  .regex(/^[1-9]\d*$/u, 'Limit must be a base-10 integer')
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value >= 1 && value <= 50, 'Limit must be between 1 and 50');

const CursorSchema = z
  .string()
  .min(1, 'Cursor must not be empty')
  .max(768, 'Cursor must not exceed 768 characters')
  .regex(BASE64URL_PATTERN, 'Cursor must be a valid base64url string');

const SlugListSchema = z
  .string()
  .superRefine((value, context) => {
    const values = value.split(',');
    if (values.length < 1 || values.length > 20) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amenity slugs must contain 1 to 20 values',
      });
      return;
    }
    if (values.some((item) => !SLUG_PATTERN.test(item))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Every amenity slug must use lowercase ASCII kebab-case',
      });
    }
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amenity slugs must not contain duplicates',
      });
    }
  })
  .transform((value) => [...value.split(',')].sort());

const RawListQuerySchema = z
  .object({
    limit: LimitSchema.optional(),
    cursor: CursorSchema.optional(),
    sort: z.enum(['newest', 'name']).optional(),
    regionSlug: SlugSchema.optional(),
    businessTypeSlug: SlugSchema.optional(),
    categorySlug: SlugSchema.optional(),
    amenitySlugs: SlugListSchema.optional(),
    parentRegionSlug: SlugSchema.optional(),
  })
  .strict();

const ALLOWED_FILTERS: Readonly<Record<PublicCatalogKind, ReadonlySet<string>>> = {
  businesses: new Set([
    'limit',
    'cursor',
    'sort',
    'regionSlug',
    'businessTypeSlug',
    'amenitySlugs',
  ]),
  places: new Set(['limit', 'cursor', 'sort', 'regionSlug']),
  attractions: new Set(['limit', 'cursor', 'sort', 'regionSlug', 'categorySlug']),
  articles: new Set(['limit', 'cursor', 'sort', 'categorySlug']),
  regions: new Set(['limit', 'cursor', 'sort', 'parentRegionSlug']),
};

function normalizeRawQuery(input: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(input.keys())) {
    const values = input.getAll(key);
    result[key] = values.length === 1 ? values[0] ?? '' : values;
  }
  return result;
}

function detailsFromZod(error: z.ZodError): Record<string, string> {
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

export function parsePublicCatalogListQuery(
  kind: PublicCatalogKind,
  input: URLSearchParams
): PublicCatalogListQuery {
  const raw = normalizeRawQuery(input);
  const disallowed = Object.keys(raw).filter((key) => !ALLOWED_FILTERS[kind].has(key));
  if (disallowed.length > 0) {
    throw new ValidationError(
      'Invalid public catalog query',
      Object.fromEntries(disallowed.map((key) => [key, `Parameter is not supported for ${kind}`]))
    );
  }
  const parsed = RawListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError('Invalid public catalog query', detailsFromZod(parsed.error));
  }
  const sort: PublicCatalogSort = parsed.data.sort ?? (kind === 'regions' ? 'name' : 'newest');
  return {
    kind,
    limit: parsed.data.limit ?? 20,
    cursor: parsed.data.cursor ?? null,
    sort,
    regionSlug: parsed.data.regionSlug ?? null,
    businessTypeSlug: parsed.data.businessTypeSlug ?? null,
    categorySlug: parsed.data.categorySlug ?? null,
    amenitySlugs: parsed.data.amenitySlugs ?? [],
    parentRegionSlug: parsed.data.parentRegionSlug ?? null,
  };
}

export function parsePublicSlug(value: unknown): string {
  const parsed = SlugSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError('Invalid public catalog slug', detailsFromZod(parsed.error));
  }
  return parsed.data;
}

export function parseCatalogKind(value: string): PublicCatalogKind | null {
  return (PUBLIC_CATALOG_KINDS as readonly string[]).includes(value)
    ? (value as PublicCatalogKind)
    : null;
}

export function parseReferenceKind(value: string): PublicReferenceKind | null {
  return (PUBLIC_REFERENCE_KINDS as readonly string[]).includes(value)
    ? (value as PublicReferenceKind)
    : null;
}
