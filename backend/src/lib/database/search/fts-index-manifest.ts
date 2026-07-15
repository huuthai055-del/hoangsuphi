import { createHash } from 'node:crypto';

export const SEARCH_FTS_CONFIGURATION = 'public.hsp_vietnamese';
export const SEARCH_FTS_CONFIGURATION_MARKER = 'hsp-search/04.01.02/config-v1';

export const SEARCH_FTS_WORD_TOKEN_TYPES = [
  'asciiword',
  'word',
  'numword',
  'asciihword',
  'hword',
  'numhword',
  'hword_asciipart',
  'hword_part',
  'hword_numpart',
] as const;

export type SearchFieldWeight = 'A' | 'B' | 'C' | 'D';

export interface SearchFtsIndexDefinition {
  readonly schemaName: 'public';
  readonly tableName: string;
  readonly indexName: string;
  readonly createSql: string;
  readonly ownershipMarker: string;
  readonly requiredColumns: readonly string[];
  readonly fieldWeights: ReadonlyArray<readonly [field: string, weight: SearchFieldWeight]>;
  readonly predicateFragments: readonly string[];
}

type SearchFtsIndexInput = Omit<SearchFtsIndexDefinition, 'ownershipMarker'>;

function defineIndex(input: SearchFtsIndexInput): SearchFtsIndexDefinition {
  const createSql = input.createSql.replaceAll('\r\n', '\n').trim();
  const checksum = createHash('sha256').update(createSql).digest('hex');

  return Object.freeze({
    ...input,
    createSql,
    ownershipMarker: `hsp-search/04.01.02/index-v1:${checksum}`,
  });
}

export const SEARCH_FTS_INDEXES = Object.freeze([
  defineIndex({
    schemaName: 'public',
    tableName: 'articles',
    indexName: 'search_articles_fts_vi_gin_idx',
    requiredColumns: [
      'title',
      'slug',
      'excerpt',
      'content',
      'deleted_at',
      'status',
      'published_at',
    ],
    fieldWeights: [
      ['title', 'A'],
      ['slug', 'B'],
      ['excerpt', 'B'],
      ['content', 'D'],
    ],
    predicateFragments: ['deleted_at is null', "status = 'published'", 'published_at is not null'],
    createSql: `
CREATE INDEX CONCURRENTLY "search_articles_fts_vi_gin_idx"
ON "public"."articles"
USING gin ((
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("title"::text, '')),
    'A'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("slug"::text, '')),
    'B'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("excerpt"::text, '')),
    'B'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("content"::text, '')),
    'D'
  )
))
WHERE "deleted_at" IS NULL
  AND "status" = 'published'::public.article_status
  AND "published_at" IS NOT NULL;
`,
  }),
  defineIndex({
    schemaName: 'public',
    tableName: 'tourist_places',
    indexName: 'search_tourist_places_fts_vi_gin_idx',
    requiredColumns: ['name', 'slug', 'description', 'deleted_at', 'status'],
    fieldWeights: [
      ['name', 'A'],
      ['slug', 'B'],
      ['description', 'C'],
    ],
    predicateFragments: ['deleted_at is null', "status = 'active'"],
    createSql: `
CREATE INDEX CONCURRENTLY "search_tourist_places_fts_vi_gin_idx"
ON "public"."tourist_places"
USING gin ((
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("name"::text, '')),
    'A'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("slug"::text, '')),
    'B'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("description"::text, '')),
    'C'
  )
))
WHERE "deleted_at" IS NULL
  AND "status" = 'active';
`,
  }),
  defineIndex({
    schemaName: 'public',
    tableName: 'businesses',
    indexName: 'search_businesses_fts_vi_gin_idx',
    requiredColumns: ['name', 'slug', 'description', 'deleted_at', 'status'],
    fieldWeights: [
      ['name', 'A'],
      ['slug', 'B'],
      ['description', 'C'],
    ],
    predicateFragments: ['deleted_at is null', "status = 'active'"],
    createSql: `
CREATE INDEX CONCURRENTLY "search_businesses_fts_vi_gin_idx"
ON "public"."businesses"
USING gin ((
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("name"::text, '')),
    'A'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("slug"::text, '')),
    'B'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("description"::text, '')),
    'C'
  )
))
WHERE "deleted_at" IS NULL
  AND "status" = 'active';
`,
  }),
  defineIndex({
    schemaName: 'public',
    tableName: 'attractions',
    indexName: 'search_attractions_fts_vi_gin_idx',
    requiredColumns: ['name', 'slug', 'description', 'deleted_at', 'status'],
    fieldWeights: [
      ['name', 'A'],
      ['slug', 'B'],
      ['description', 'C'],
    ],
    predicateFragments: ['deleted_at is null', "status = 'active'"],
    createSql: `
CREATE INDEX CONCURRENTLY "search_attractions_fts_vi_gin_idx"
ON "public"."attractions"
USING gin ((
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("name"::text, '')),
    'A'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("slug"::text, '')),
    'B'
  ) ||
  setweight(
    to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE("description"::text, '')),
    'C'
  )
))
WHERE "deleted_at" IS NULL
  AND "status" = 'active';
`,
  }),
]);
