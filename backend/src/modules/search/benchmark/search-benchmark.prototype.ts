import { SEARCH_FTS_INDEXES } from '@/lib/database/search/fts-index-manifest';
import postgres from 'postgres';
import { assertDedicatedBenchmarkDatabase } from './search-benchmark.model';

const PROTOTYPE_MARKER = 'hsp-search/04.01.06/benchmark-stored-vector-v1';
const ROLLBACK_WORKLOAD = Symbol('rollback-search-prototype-workload');

export interface SearchStoredVectorPrototypeDefinition {
  readonly tableName: 'articles' | 'tourist_places' | 'businesses' | 'attractions';
  readonly columnName: 'search_vector';
  readonly addColumnSql: string;
  readonly indexName: string;
  readonly createIndexSql: string;
  readonly updateWorkloadSql: string;
  readonly insertWorkloadSql: string;
}

export const SEARCH_STORED_VECTOR_PROTOTYPES: readonly SearchStoredVectorPrototypeDefinition[] = [
  {
    tableName: 'articles',
    columnName: 'search_vector',
    addColumnSql: `ALTER TABLE public.articles
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(title::text, '')), 'A') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(slug::text, '')), 'B') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(excerpt::text, '')), 'B') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(content::text, '')), 'D')
) STORED`,
    indexName: 'benchmark_search_articles_stored_fts_gin_idx',
    createIndexSql: `CREATE INDEX CONCURRENTLY benchmark_search_articles_stored_fts_gin_idx
ON public.articles USING gin (search_vector)
WHERE deleted_at IS NULL
  AND status = 'published'::public.article_status
  AND published_at IS NOT NULL`,
    updateWorkloadSql: `WITH target AS (
  SELECT id FROM public.articles ORDER BY id LIMIT 1000
)
UPDATE public.articles AS source
SET title = source.title
FROM target
WHERE source.id = target.id
RETURNING source.id`,
    insertWorkloadSql: `INSERT INTO public.articles (
  id, title, slug, excerpt, content, thumbnail_id, author_id, category_id, status,
  view_count, is_featured, published_at, created_at, updated_at, deleted_at
)
SELECT
  md5(id::text || ':prototype-insert')::uuid,
  title,
  slug || '-prototype',
  excerpt,
  content,
  thumbnail_id,
  author_id,
  category_id,
  status,
  view_count,
  is_featured,
  published_at,
  created_at,
  updated_at,
  deleted_at
FROM public.articles
ORDER BY id
LIMIT 100
RETURNING id`,
  },
  {
    tableName: 'tourist_places',
    columnName: 'search_vector',
    addColumnSql: `ALTER TABLE public.tourist_places
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(name::text, '')), 'A') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(slug::text, '')), 'B') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(description::text, '')), 'C')
) STORED`,
    indexName: 'benchmark_search_tourist_places_stored_fts_gin_idx',
    createIndexSql: `CREATE INDEX CONCURRENTLY benchmark_search_tourist_places_stored_fts_gin_idx
ON public.tourist_places USING gin (search_vector)
WHERE deleted_at IS NULL AND status = 'active'`,
    updateWorkloadSql: `WITH target AS (
  SELECT id FROM public.tourist_places ORDER BY id LIMIT 1000
)
UPDATE public.tourist_places AS source
SET name = source.name
FROM target
WHERE source.id = target.id
RETURNING source.id`,
    insertWorkloadSql: `INSERT INTO public.tourist_places (
  id, region_id, name, slug, location, description, cover_url, status,
  created_at, updated_at, deleted_at
)
SELECT
  md5(id::text || ':prototype-insert')::uuid,
  region_id,
  name,
  slug || '-prototype',
  location,
  description,
  cover_url,
  status,
  created_at,
  updated_at,
  deleted_at
FROM public.tourist_places
ORDER BY id
LIMIT 100
RETURNING id`,
  },
  {
    tableName: 'businesses',
    columnName: 'search_vector',
    addColumnSql: `ALTER TABLE public.businesses
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(name::text, '')), 'A') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(slug::text, '')), 'B') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(description::text, '')), 'C')
) STORED`,
    indexName: 'benchmark_search_businesses_stored_fts_gin_idx',
    createIndexSql: `CREATE INDEX CONCURRENTLY benchmark_search_businesses_stored_fts_gin_idx
ON public.businesses USING gin (search_vector)
WHERE deleted_at IS NULL AND status = 'active'`,
    updateWorkloadSql: `WITH target AS (
  SELECT id FROM public.businesses ORDER BY id LIMIT 1000
)
UPDATE public.businesses AS source
SET name = source.name
FROM target
WHERE source.id = target.id
RETURNING source.id`,
    insertWorkloadSql: `INSERT INTO public.businesses (
  id, region_id, business_type_id, name, slug, location, description, cover_url,
  status, created_at, updated_at, deleted_at
)
SELECT
  md5(id::text || ':prototype-insert')::uuid,
  region_id,
  business_type_id,
  name,
  slug || '-prototype',
  location,
  description,
  cover_url,
  status,
  created_at,
  updated_at,
  deleted_at
FROM public.businesses
ORDER BY id
LIMIT 100
RETURNING id`,
  },
  {
    tableName: 'attractions',
    columnName: 'search_vector',
    addColumnSql: `ALTER TABLE public.attractions
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(name::text, '')), 'A') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(slug::text, '')), 'B') ||
  setweight(to_tsvector('public.hsp_vietnamese'::regconfig, COALESCE(description::text, '')), 'C')
) STORED`,
    indexName: 'benchmark_search_attractions_stored_fts_gin_idx',
    createIndexSql: `CREATE INDEX CONCURRENTLY benchmark_search_attractions_stored_fts_gin_idx
ON public.attractions USING gin (search_vector)
WHERE deleted_at IS NULL AND status = 'active'`,
    updateWorkloadSql: `WITH target AS (
  SELECT id FROM public.attractions ORDER BY id LIMIT 1000
)
UPDATE public.attractions AS source
SET name = source.name
FROM target
WHERE source.id = target.id
RETURNING source.id`,
    insertWorkloadSql: `INSERT INTO public.attractions (
  id, region_id, category_id, name, slug, location, description, cover_url,
  status, created_at, updated_at, deleted_at
)
SELECT
  md5(id::text || ':prototype-insert')::uuid,
  region_id,
  category_id,
  name,
  slug || '-prototype',
  location,
  description,
  cover_url,
  status,
  created_at,
  updated_at,
  deleted_at
FROM public.attractions
ORDER BY id
LIMIT 100
RETURNING id`,
  },
] as const;

type SqlClient = ReturnType<typeof postgres>;

interface IdentityRow {
  readonly databaseName: string;
  readonly serverVersionNum: number;
  readonly readOnly: boolean;
}

interface LsnRow {
  readonly lsn: string;
}

interface WalDifferenceRow {
  readonly bytes: string;
}

interface RelationStateRow {
  readonly relfilenode: string;
  readonly tableBytes: string;
  readonly totalBytes: string;
}

interface ColumnStateRow {
  readonly isGenerated: string;
  readonly dataType: string;
  readonly generationExpression: string | null;
}

interface IndexStateRow {
  readonly indexName: string;
  readonly accessMethod: string;
  readonly isValid: boolean;
  readonly isReady: boolean;
  readonly sizeBytes: string;
}

interface AutovacuumRow {
  readonly tableName: string;
  readonly liveRows: string;
  readonly deadRows: string;
  readonly vacuumThreshold: string;
  readonly analyzeThreshold: string;
}

interface OperationMeasurement {
  readonly elapsedMs: number;
  readonly walBytes: number;
}

interface WriteMeasurement extends OperationMeasurement {
  readonly tableName: string;
  readonly operation: 'insert_100' | 'update_1000';
  readonly affectedRows: number;
}

function requireRow<T>(rows: readonly T[], context: string): T {
  const row = rows[0];
  if (!row) throw new Error(`No PostgreSQL row returned for ${context}`);
  return row;
}

async function currentLsn(sqlClient: SqlClient): Promise<string> {
  const rows = await sqlClient<LsnRow[]>`SELECT pg_current_wal_insert_lsn()::text AS lsn`;
  return requireRow(rows, 'current WAL LSN').lsn;
}

async function walDifference(sqlClient: SqlClient, start: string, end: string): Promise<number> {
  const rows = await sqlClient<WalDifferenceRow[]>`
    SELECT pg_wal_lsn_diff(${end}::pg_lsn, ${start}::pg_lsn)::text AS bytes
  `;
  return Number(requireRow(rows, 'WAL difference').bytes);
}

async function relationState(sqlClient: SqlClient, tableName: string): Promise<RelationStateRow> {
  const rows = await sqlClient<RelationStateRow[]>`
    SELECT
      table_class.relfilenode::text AS relfilenode,
      pg_relation_size(table_class.oid)::text AS "tableBytes",
      pg_total_relation_size(table_class.oid)::text AS "totalBytes"
    FROM pg_class AS table_class
    INNER JOIN pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
    WHERE namespace.nspname = 'public' AND table_class.relname = ${tableName}
  `;
  return requireRow(rows, `relation state for ${tableName}`);
}

async function measureSql(sqlClient: SqlClient, statement: string): Promise<OperationMeasurement> {
  const startLsn = await currentLsn(sqlClient);
  const startedAt = performance.now();
  await sqlClient.unsafe(statement);
  const elapsedMs = performance.now() - startedAt;
  const endLsn = await currentLsn(sqlClient);
  return { elapsedMs, walBytes: await walDifference(sqlClient, startLsn, endLsn) };
}

async function measureRolledBackWrite(
  sqlClient: SqlClient,
  definition: SearchStoredVectorPrototypeDefinition,
  operation: WriteMeasurement['operation']
): Promise<WriteMeasurement> {
  const statement =
    operation === 'insert_100' ? definition.insertWorkloadSql : definition.updateWorkloadSql;
  const startLsn = await currentLsn(sqlClient);
  const startedAt = performance.now();
  let affectedRows = 0;

  try {
    await sqlClient.begin(async (transaction) => {
      const rows = await transaction.unsafe<{ id: string }[]>(statement);
      affectedRows = rows.length;
      throw ROLLBACK_WORKLOAD;
    });
  } catch (error) {
    if (error !== ROLLBACK_WORKLOAD) throw error;
  }

  const elapsedMs = performance.now() - startedAt;
  const endLsn = await currentLsn(sqlClient);
  return {
    tableName: definition.tableName,
    operation,
    affectedRows,
    elapsedMs,
    walBytes: await walDifference(sqlClient, startLsn, endLsn),
  };
}

async function measureWriteStage(
  sqlClient: SqlClient,
  stage: 'expression_baseline' | 'stored_column' | 'stored_column_and_gin'
): Promise<{ readonly stage: string; readonly writes: readonly WriteMeasurement[] }> {
  const writes: WriteMeasurement[] = [];
  for (const definition of SEARCH_STORED_VECTOR_PROTOTYPES) {
    writes.push(await measureRolledBackWrite(sqlClient, definition, 'insert_100'));
    writes.push(await measureRolledBackWrite(sqlClient, definition, 'update_1000'));
  }
  return { stage, writes };
}

async function inspectColumn(
  sqlClient: SqlClient,
  definition: SearchStoredVectorPrototypeDefinition
): Promise<ColumnStateRow | null> {
  const rows = await sqlClient<ColumnStateRow[]>`
    SELECT
      is_generated AS "isGenerated",
      data_type AS "dataType",
      generation_expression AS "generationExpression"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${definition.tableName}
      AND column_name = ${definition.columnName}
  `;
  return rows[0] ?? null;
}

async function inspectIndex(
  sqlClient: SqlClient,
  definition: SearchStoredVectorPrototypeDefinition
): Promise<IndexStateRow | null> {
  const rows = await sqlClient<IndexStateRow[]>`
    SELECT
      index_class.relname AS "indexName",
      access_method.amname AS "accessMethod",
      index_catalog.indisvalid AS "isValid",
      index_catalog.indisready AS "isReady",
      pg_relation_size(index_catalog.indexrelid)::text AS "sizeBytes"
    FROM pg_index AS index_catalog
    INNER JOIN pg_class AS index_class ON index_class.oid = index_catalog.indexrelid
    INNER JOIN pg_am AS access_method ON access_method.oid = index_class.relam
    WHERE index_class.relname = ${definition.indexName}
  `;
  return rows[0] ?? null;
}

function validateColumn(
  definition: SearchStoredVectorPrototypeDefinition,
  column: ColumnStateRow
): void {
  const expression = column.generationExpression?.toLowerCase() ?? '';
  if (
    column.isGenerated !== 'ALWAYS' ||
    column.dataType !== 'tsvector' ||
    !expression.includes('hsp_vietnamese')
  ) {
    throw new Error(`${definition.tableName}.search_vector does not match the prototype contract`);
  }
}

async function inspectAutovacuum(sqlClient: SqlClient): Promise<readonly AutovacuumRow[]> {
  return sqlClient<AutovacuumRow[]>`
    SELECT
      stats.relname AS "tableName",
      stats.n_live_tup::text AS "liveRows",
      stats.n_dead_tup::text AS "deadRows",
      (
        current_setting('autovacuum_vacuum_threshold')::numeric +
        current_setting('autovacuum_vacuum_scale_factor')::numeric * stats.n_live_tup
      )::text AS "vacuumThreshold",
      (
        current_setting('autovacuum_analyze_threshold')::numeric +
        current_setting('autovacuum_analyze_scale_factor')::numeric * stats.n_live_tup
      )::text AS "analyzeThreshold"
    FROM pg_stat_user_tables AS stats
    WHERE stats.relname = ANY(
      ${sqlClient.array(SEARCH_STORED_VECTOR_PROTOTYPES.map(({ tableName }) => tableName))}::text[]
    )
    ORDER BY stats.relname
  `;
}

export async function applyStoredVectorBenchmarkPrototype(
  databaseUrl: string
): Promise<Record<string, unknown>> {
  const expectedDatabase = assertDedicatedBenchmarkDatabase(databaseUrl);
  const sqlClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    onnotice: () => undefined,
  });

  try {
    const identityRows = await sqlClient<IdentityRow[]>`
      SELECT
        current_database() AS "databaseName",
        current_setting('server_version_num')::integer AS "serverVersionNum",
        current_setting('transaction_read_only')::boolean AS "readOnly"
    `;
    const identity = requireRow(identityRows, 'prototype database identity');
    if (identity.databaseName !== expectedDatabase || identity.readOnly) {
      throw new Error('Stored-vector prototype database identity/read-only guard failed');
    }
    if (Math.floor(identity.serverVersionNum / 10_000) !== 17) {
      throw new Error(`PostgreSQL 17 is required; found ${identity.serverVersionNum}`);
    }

    const initialColumns = await Promise.all(
      SEARCH_STORED_VECTOR_PROTOTYPES.map((definition) => inspectColumn(sqlClient, definition))
    );
    const isFreshPrototype = initialColumns.every((column) => column === null);
    if (!isFreshPrototype && initialColumns.some((column) => column === null)) {
      throw new Error('Partial stored-vector prototype detected; inspect before retrying');
    }

    const writeStages: Array<Awaited<ReturnType<typeof measureWriteStage>>> = [];
    if (isFreshPrototype) {
      writeStages.push(await measureWriteStage(sqlClient, 'expression_baseline'));
    }

    const columnOperations: Record<string, unknown>[] = [];
    for (const definition of SEARCH_STORED_VECTOR_PROTOTYPES) {
      const existing = await inspectColumn(sqlClient, definition);
      if (existing) {
        validateColumn(definition, existing);
        columnOperations.push({ tableName: definition.tableName, status: 'ready' });
        continue;
      }

      const before = await relationState(sqlClient, definition.tableName);
      const measurement = await measureSql(sqlClient, definition.addColumnSql);
      await sqlClient.unsafe(
        `COMMENT ON COLUMN public.${definition.tableName}.${definition.columnName} IS '${PROTOTYPE_MARKER}'`
      );
      const after = await relationState(sqlClient, definition.tableName);
      const created = await inspectColumn(sqlClient, definition);
      if (!created) throw new Error(`${definition.tableName}.search_vector was not created`);
      validateColumn(definition, created);
      columnOperations.push({
        tableName: definition.tableName,
        status: 'created',
        ...measurement,
        relfilenodeChanged: before.relfilenode !== after.relfilenode,
        tableBytesBefore: Number(before.tableBytes),
        tableBytesAfter: Number(after.tableBytes),
        totalBytesBefore: Number(before.totalBytes),
        totalBytesAfter: Number(after.totalBytes),
      });
    }

    if (isFreshPrototype) {
      writeStages.push(await measureWriteStage(sqlClient, 'stored_column'));
    }

    const indexOperations: Record<string, unknown>[] = [];
    for (const definition of SEARCH_STORED_VECTOR_PROTOTYPES) {
      const existing = await inspectIndex(sqlClient, definition);
      if (existing) {
        if (existing.accessMethod !== 'gin' || !existing.isValid || !existing.isReady) {
          throw new Error(`${definition.indexName} is invalid, unready or not GIN`);
        }
        indexOperations.push({ ...existing, status: 'ready' });
        continue;
      }

      const measurement = await measureSql(sqlClient, definition.createIndexSql);
      await sqlClient.unsafe(
        `COMMENT ON INDEX public.${definition.indexName} IS '${PROTOTYPE_MARKER}'`
      );
      const created = await inspectIndex(sqlClient, definition);
      if (!created || !created.isValid || !created.isReady || created.accessMethod !== 'gin') {
        throw new Error(`${definition.indexName} failed post-build validation`);
      }
      await sqlClient.unsafe(`ANALYZE public.${definition.tableName}`);
      indexOperations.push({ ...created, status: 'created', ...measurement });
    }

    if (isFreshPrototype) {
      writeStages.push(await measureWriteStage(sqlClient, 'stored_column_and_gin'));
    }

    const expressionIndexes = await sqlClient<IndexStateRow[]>`
      SELECT
        index_class.relname AS "indexName",
        access_method.amname AS "accessMethod",
        index_catalog.indisvalid AS "isValid",
        index_catalog.indisready AS "isReady",
        pg_relation_size(index_catalog.indexrelid)::text AS "sizeBytes"
      FROM pg_index AS index_catalog
      INNER JOIN pg_class AS index_class ON index_class.oid = index_catalog.indexrelid
      INNER JOIN pg_am AS access_method ON access_method.oid = index_class.relam
      WHERE index_class.relname = ANY(
        ${sqlClient.array(SEARCH_FTS_INDEXES.map(({ indexName }) => indexName))}::text[]
      )
      ORDER BY index_class.relname
    `;
    if (
      expressionIndexes.length !== SEARCH_FTS_INDEXES.length ||
      expressionIndexes.some((index) => !index.isValid || !index.isReady)
    ) {
      throw new Error('Expression FTS indexes must remain valid and ready during prototype');
    }

    return {
      generatedAt: new Date().toISOString(),
      status: 'benchmark_prototype_ready',
      productionMigrationApproved: false,
      identity,
      marker: PROTOTYPE_MARKER,
      columns: columnOperations,
      replacementIndexes: indexOperations,
      expressionIndexesRetained: expressionIndexes,
      writeStages,
      autovacuum: await inspectAutovacuum(sqlClient),
      operationalNotes: {
        columnOperationLock: 'ALTER TABLE ADD STORED generated column requires ACCESS EXCLUSIVE',
        indexOperation: 'CREATE INDEX CONCURRENTLY, outside transaction',
        oldIndexPolicy: 'Expression indexes retained until replacement indexes pass all gates',
      },
    };
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

export async function measureSearchBenchmarkWriteImpact(
  databaseUrl: string
): Promise<Record<string, unknown>> {
  const expectedDatabase = assertDedicatedBenchmarkDatabase(databaseUrl);
  const sqlClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    onnotice: () => undefined,
  });

  try {
    const identityRows = await sqlClient<IdentityRow[]>`
      SELECT
        current_database() AS "databaseName",
        current_setting('server_version_num')::integer AS "serverVersionNum",
        current_setting('transaction_read_only')::boolean AS "readOnly"
    `;
    const identity = requireRow(identityRows, 'write-impact database identity');
    if (identity.databaseName !== expectedDatabase || identity.readOnly) {
      throw new Error('Write-impact database identity/read-only guard failed');
    }

    const columns = await Promise.all(
      SEARCH_STORED_VECTOR_PROTOTYPES.map((definition) => inspectColumn(sqlClient, definition))
    );
    const hasStoredColumns = columns.every((column) => column !== null);
    if (!hasStoredColumns && columns.some((column) => column !== null)) {
      throw new Error(
        'Partial stored-vector prototype detected; write impact cannot be classified'
      );
    }

    const stage = hasStoredColumns ? 'stored_column_and_gin' : 'expression_baseline';
    return {
      generatedAt: new Date().toISOString(),
      identity,
      stage,
      lsnSource: 'pg_current_wal_insert_lsn',
      measurement: await measureWriteStage(sqlClient, stage),
      autovacuum: await inspectAutovacuum(sqlClient),
      caveats: [
        'Every write sample is rolled back after PostgreSQL executes it.',
        'WAL still includes rolled-back tuple/index work and local background activity may add noise.',
        'Elapsed time is a microbenchmark on local Docker, not a production throughput guarantee.',
      ],
    };
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}
