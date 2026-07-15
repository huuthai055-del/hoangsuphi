import type postgres from 'postgres';
import {
  SEARCH_FTS_CONFIGURATION,
  SEARCH_FTS_INDEXES,
  SEARCH_FTS_WORD_TOKEN_TYPES,
  type SearchFtsIndexDefinition,
} from './fts-index-manifest';
import type {
  SearchFtsEnvironmentAudit,
  SearchFtsIndexCatalogEntry,
  SearchFtsIndexStore,
  SearchFtsSemanticAudit,
} from './fts-index-migrator';

type PostgresClient = ReturnType<typeof postgres>;

interface EnvironmentRow {
  serverVersionNum: number;
  databaseName: string;
  userName: string;
  transactionReadOnly: boolean;
  unaccentVersion: string | null;
  unaccentSchema: string | null;
  configurationExists: boolean;
  configurationMarker: string | null;
}

interface TokenMappingRow {
  tokenType: string;
  dictionaryChain: string[];
}

interface ColumnRow {
  columnName: string;
}

interface ManageableTableRow {
  canManage: boolean;
}

interface SemanticRow {
  accentedQueryMatches: boolean;
  dStrokeQueryMatches: boolean;
  nfdDocumentMatches: boolean;
  slugQueryMatches: boolean;
  punctuationParserSafe: boolean;
  punctuationOnlyProducesEmptyQuery: boolean;
}

interface AdvisoryLockRow {
  acquired: boolean;
}

interface AdvisoryUnlockRow {
  released: boolean;
}

interface IndexCatalogRow {
  schemaName: string;
  tableName: string;
  accessMethod: string;
  isValid: boolean;
  isReady: boolean;
  definition: string;
  expression: string | null;
  predicate: string | null;
  ownershipMarker: string | null;
}

const MIGRATION_LOCK_NAME = 'hsp-search/04.01.02/fts-indexes-v1';

const FAILED_SEMANTIC_AUDIT: SearchFtsSemanticAudit = {
  accentedQueryMatches: false,
  dStrokeQueryMatches: false,
  nfdDocumentMatches: false,
  slugQueryMatches: false,
  punctuationParserSafe: false,
  punctuationOnlyProducesEmptyQuery: false,
};

function requireRow<T>(rows: readonly T[], context: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(`Database returned no row for ${context}`);
  }
  return row;
}

function quoteStaticIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe static PostgreSQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function quoteStaticLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export class PostgresSearchFtsIndexStore implements SearchFtsIndexStore {
  constructor(private readonly sql: PostgresClient) {}

  async inspectEnvironment(): Promise<SearchFtsEnvironmentAudit> {
    const environmentRows = await this.sql<EnvironmentRow[]>`
      SELECT
        current_setting('server_version_num')::integer AS "serverVersionNum",
        current_database() AS "databaseName",
        current_user AS "userName",
        current_setting('transaction_read_only')::boolean AS "transactionReadOnly",
        (
          SELECT extension.extversion
          FROM pg_catalog.pg_extension AS extension
          WHERE extension.extname = 'unaccent'
        ) AS "unaccentVersion",
        (
          SELECT namespace.nspname
          FROM pg_catalog.pg_extension AS extension
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = extension.extnamespace
          WHERE extension.extname = 'unaccent'
        ) AS "unaccentSchema",
        EXISTS (
          SELECT 1
          FROM pg_catalog.pg_ts_config AS configuration
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = configuration.cfgnamespace
          WHERE namespace.nspname = 'public'
            AND configuration.cfgname = 'hsp_vietnamese'
        ) AS "configurationExists",
        (
          SELECT pg_catalog.obj_description(configuration.oid, 'pg_ts_config')
          FROM pg_catalog.pg_ts_config AS configuration
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = configuration.cfgnamespace
          WHERE namespace.nspname = 'public'
            AND configuration.cfgname = 'hsp_vietnamese'
        ) AS "configurationMarker"
    `;
    const environment = requireRow(environmentRows, 'Search FTS environment audit');

    const tokenMappings = environment.configurationExists ? await this.inspectTokenMappings() : {};
    const semantic = environment.configurationExists
      ? await this.inspectSemantics()
      : FAILED_SEMANTIC_AUDIT;
    const { missingColumns, manageableTables } = await this.inspectSourceTables();

    return {
      ...environment,
      tokenMappings,
      missingColumns,
      manageableTables,
      semantic,
    };
  }

  async tryAcquireMigrationLock(): Promise<boolean> {
    const rows = await this.sql<AdvisoryLockRow[]>`
      SELECT pg_catalog.pg_try_advisory_lock(
        pg_catalog.hashtextextended(${MIGRATION_LOCK_NAME}, 0)
      ) AS "acquired"
    `;
    return requireRow(rows, 'Search FTS advisory lock').acquired;
  }

  async releaseMigrationLock(): Promise<void> {
    const rows = await this.sql<AdvisoryUnlockRow[]>`
      SELECT pg_catalog.pg_advisory_unlock(
        pg_catalog.hashtextextended(${MIGRATION_LOCK_NAME}, 0)
      ) AS "released"
    `;
    if (!requireRow(rows, 'Search FTS advisory unlock').released) {
      throw new Error('Search FTS advisory lock was not owned by this session');
    }
  }

  async inspectIndex(
    definition: SearchFtsIndexDefinition
  ): Promise<SearchFtsIndexCatalogEntry | null> {
    const rows = await this.sql<IndexCatalogRow[]>`
      SELECT
        index_namespace.nspname AS "schemaName",
        table_class.relname AS "tableName",
        access_method.amname AS "accessMethod",
        index_entry.indisvalid AS "isValid",
        index_entry.indisready AS "isReady",
        pg_catalog.pg_get_indexdef(index_entry.indexrelid) AS "definition",
        pg_catalog.pg_get_expr(index_entry.indexprs, index_entry.indrelid) AS "expression",
        pg_catalog.pg_get_expr(index_entry.indpred, index_entry.indrelid) AS "predicate",
        pg_catalog.obj_description(index_class.oid, 'pg_class') AS "ownershipMarker"
      FROM pg_catalog.pg_index AS index_entry
      INNER JOIN pg_catalog.pg_class AS index_class
        ON index_class.oid = index_entry.indexrelid
      INNER JOIN pg_catalog.pg_namespace AS index_namespace
        ON index_namespace.oid = index_class.relnamespace
      INNER JOIN pg_catalog.pg_class AS table_class
        ON table_class.oid = index_entry.indrelid
      INNER JOIN pg_catalog.pg_am AS access_method
        ON access_method.oid = index_class.relam
      WHERE index_namespace.nspname = ${definition.schemaName}
        AND index_class.relname = ${definition.indexName}
    `;

    return rows[0] ?? null;
  }

  async createIndex(definition: SearchFtsIndexDefinition): Promise<void> {
    await this.sql.unsafe(definition.createSql);

    const schemaName = quoteStaticIdentifier(definition.schemaName);
    const indexName = quoteStaticIdentifier(definition.indexName);
    const marker = quoteStaticLiteral(definition.ownershipMarker);
    await this.sql.unsafe(`COMMENT ON INDEX ${schemaName}.${indexName} IS ${marker};`);
  }

  async analyzeTable(definition: SearchFtsIndexDefinition): Promise<void> {
    const schemaName = quoteStaticIdentifier(definition.schemaName);
    const tableName = quoteStaticIdentifier(definition.tableName);
    await this.sql.unsafe(`ANALYZE ${schemaName}.${tableName};`);
  }

  private async inspectTokenMappings(): Promise<Record<string, readonly string[]>> {
    const rows = await this.sql<TokenMappingRow[]>`
      SELECT
        token.alias AS "tokenType",
        array_agg(
          pg_catalog.format('%I.%I', dictionary_namespace.nspname, dictionary.dictname)
          ORDER BY mapping.mapseqno
        )::text[] AS "dictionaryChain"
      FROM pg_catalog.pg_ts_config AS configuration
      INNER JOIN pg_catalog.pg_namespace AS configuration_namespace
        ON configuration_namespace.oid = configuration.cfgnamespace
      INNER JOIN pg_catalog.pg_ts_config_map AS mapping
        ON mapping.mapcfg = configuration.oid
      INNER JOIN pg_catalog.pg_ts_dict AS dictionary
        ON dictionary.oid = mapping.mapdict
      INNER JOIN pg_catalog.pg_namespace AS dictionary_namespace
        ON dictionary_namespace.oid = dictionary.dictnamespace
      CROSS JOIN LATERAL pg_catalog.ts_token_type(configuration.cfgparser) AS token
      WHERE configuration_namespace.nspname = 'public'
        AND configuration.cfgname = 'hsp_vietnamese'
        AND token.tokid = mapping.maptokentype
        AND token.alias = ANY(
          ${this.sql.array([...SEARCH_FTS_WORD_TOKEN_TYPES])}::text[]
        )
      GROUP BY token.alias
    `;

    return Object.fromEntries(rows.map((row) => [row.tokenType, row.dictionaryChain]));
  }

  private async inspectSemantics(): Promise<SearchFtsSemanticAudit> {
    const accentedName = 'Hoàng Su Phì';
    const unaccentedName = 'hoang su phi';
    const nfdName = accentedName.normalize('NFD');
    const rows = await this.sql<SemanticRow[]>`
      SELECT
        to_tsvector(${SEARCH_FTS_CONFIGURATION}::regconfig, ${accentedName})
          @@ websearch_to_tsquery(${SEARCH_FTS_CONFIGURATION}::regconfig, ${unaccentedName})
          AS "accentedQueryMatches",
        to_tsvector(${SEARCH_FTS_CONFIGURATION}::regconfig, ${'Đồng Văn'})
          @@ websearch_to_tsquery(${SEARCH_FTS_CONFIGURATION}::regconfig, ${'dong van'})
          AS "dStrokeQueryMatches",
        to_tsvector(${SEARCH_FTS_CONFIGURATION}::regconfig, ${nfdName})
          @@ websearch_to_tsquery(${SEARCH_FTS_CONFIGURATION}::regconfig, ${unaccentedName})
          AS "nfdDocumentMatches",
        to_tsvector(${SEARCH_FTS_CONFIGURATION}::regconfig, ${'hoang-su-phi'})
          @@ websearch_to_tsquery(${SEARCH_FTS_CONFIGURATION}::regconfig, ${unaccentedName})
          AS "slugQueryMatches",
        websearch_to_tsquery(
          ${SEARCH_FTS_CONFIGURATION}::regconfig,
          ${'("hoang" OR -phi) ???'}
        ) IS NOT NULL AS "punctuationParserSafe",
        numnode(
          websearch_to_tsquery(${SEARCH_FTS_CONFIGURATION}::regconfig, ${'???'})
        ) = 0 AS "punctuationOnlyProducesEmptyQuery"
    `;

    return requireRow(rows, 'Vietnamese FTS semantic audit');
  }

  private async inspectSourceTables(): Promise<{
    missingColumns: string[];
    manageableTables: Record<string, boolean>;
  }> {
    const missingColumns: string[] = [];
    const manageableTables: Record<string, boolean> = {};

    for (const definition of SEARCH_FTS_INDEXES) {
      const columnRows = await this.sql<ColumnRow[]>`
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = ${definition.schemaName}
          AND table_name = ${definition.tableName}
      `;
      const existingColumns = new Set(columnRows.map((row) => row.columnName));
      for (const requiredColumn of definition.requiredColumns) {
        if (!existingColumns.has(requiredColumn)) {
          missingColumns.push(`${definition.schemaName}.${definition.tableName}.${requiredColumn}`);
        }
      }

      const manageableRows = await this.sql<ManageableTableRow[]>`
        SELECT pg_catalog.pg_has_role(current_user, table_class.relowner, 'USAGE') AS "canManage"
        FROM pg_catalog.pg_class AS table_class
        INNER JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = table_class.relnamespace
        WHERE namespace.nspname = ${definition.schemaName}
          AND table_class.relname = ${definition.tableName}
          AND table_class.relkind IN ('r', 'p')
      `;
      manageableTables[definition.tableName] = manageableRows[0]?.canManage ?? false;
    }

    return { missingColumns, manageableTables };
  }
}
