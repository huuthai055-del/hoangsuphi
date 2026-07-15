import { describe, expect, test } from 'bun:test';
import {
  SEARCH_FTS_CONFIGURATION_MARKER,
  SEARCH_FTS_INDEXES,
  SEARCH_FTS_WORD_TOKEN_TYPES,
  type SearchFtsIndexDefinition,
} from './fts-index-manifest';
import {
  SearchFtsMigrationError,
  parseSearchFtsMigrationMode,
  runSearchFtsIndexMigration,
  validateEnvironment,
  validateIndexCatalogEntry,
  type SearchFtsEnvironmentAudit,
  type SearchFtsIndexCatalogEntry,
  type SearchFtsIndexStore,
} from './fts-index-migrator';

function createEnvironment(
  overrides: Partial<SearchFtsEnvironmentAudit> = {}
): SearchFtsEnvironmentAudit {
  return {
    serverVersionNum: 170005,
    databaseName: 'hoangsuphi',
    userName: 'postgres',
    transactionReadOnly: false,
    unaccentVersion: '1.1',
    unaccentSchema: 'public',
    configurationExists: true,
    configurationMarker: SEARCH_FTS_CONFIGURATION_MARKER,
    tokenMappings: Object.fromEntries(
      SEARCH_FTS_WORD_TOKEN_TYPES.map((tokenType) => [
        tokenType,
        ['public.unaccent', 'pg_catalog.simple'],
      ])
    ),
    missingColumns: [],
    manageableTables: Object.fromEntries(
      SEARCH_FTS_INDEXES.map((definition) => [definition.tableName, true])
    ),
    semantic: {
      accentedQueryMatches: true,
      dStrokeQueryMatches: true,
      nfdDocumentMatches: true,
      slugQueryMatches: true,
      punctuationParserSafe: true,
      punctuationOnlyProducesEmptyQuery: true,
    },
    ...overrides,
  };
}

function createCatalogEntry(
  definition: SearchFtsIndexDefinition,
  overrides: Partial<SearchFtsIndexCatalogEntry> = {}
): SearchFtsIndexCatalogEntry {
  const expression = definition.fieldWeights
    .map(
      ([field, weight]) =>
        `setweight(to_tsvector('public.hsp_vietnamese'::regconfig, coalesce(${field}::text, '')), '${weight}'::"char")`
    )
    .join(' || ');

  return {
    schemaName: definition.schemaName,
    tableName: definition.tableName,
    accessMethod: 'gin',
    isValid: true,
    isReady: true,
    definition: definition.createSql,
    expression,
    predicate: definition.predicateFragments.join(' AND '),
    ownershipMarker: definition.ownershipMarker,
    ...overrides,
  };
}

class FakeSearchFtsIndexStore implements SearchFtsIndexStore {
  readonly entries = new Map<string, SearchFtsIndexCatalogEntry>();
  readonly created: string[] = [];
  readonly analyzed: string[] = [];
  lockAvailable = true;
  lockReleased = false;

  constructor(readonly environment: SearchFtsEnvironmentAudit) {}

  async inspectEnvironment(): Promise<SearchFtsEnvironmentAudit> {
    return this.environment;
  }

  async tryAcquireMigrationLock(): Promise<boolean> {
    return this.lockAvailable;
  }

  async releaseMigrationLock(): Promise<void> {
    this.lockReleased = true;
  }

  async inspectIndex(
    definition: SearchFtsIndexDefinition
  ): Promise<SearchFtsIndexCatalogEntry | null> {
    return this.entries.get(definition.indexName) ?? null;
  }

  async createIndex(definition: SearchFtsIndexDefinition): Promise<void> {
    this.created.push(definition.indexName);
    this.entries.set(definition.indexName, createCatalogEntry(definition));
  }

  async analyzeTable(definition: SearchFtsIndexDefinition): Promise<void> {
    this.analyzed.push(definition.tableName);
  }
}

describe('Vietnamese FTS index manifest', () => {
  test('owns exactly four concurrent partial GIN indexes', () => {
    expect(SEARCH_FTS_INDEXES).toHaveLength(4);

    for (const definition of SEARCH_FTS_INDEXES) {
      expect(definition.createSql).toContain('CREATE INDEX CONCURRENTLY');
      expect(definition.createSql).toContain('USING gin');
      expect(definition.createSql).toContain("'public.hsp_vietnamese'::regconfig");
      expect(definition.createSql).toContain('WHERE "deleted_at" IS NULL');
      expect(definition.createSql.toLowerCase()).not.toContain('now()');
      expect(definition.createSql.toLowerCase()).not.toContain('price');
      expect(definition.ownershipMarker).toMatch(/^hsp-search\/04\.01\.02\/index-v1:[a-f0-9]{64}$/);
    }
  });

  test('rejects catalog drift and an invalid concurrent index', () => {
    const definition = SEARCH_FTS_INDEXES[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    expect(validateIndexCatalogEntry(definition, createCatalogEntry(definition))).toEqual([]);
    const issues = validateIndexCatalogEntry(
      definition,
      createCatalogEntry(definition, {
        isValid: false,
        ownershipMarker: 'unexpected',
      })
    );
    expect(issues.some((issue) => issue.includes('invalid or not ready'))).toBe(true);
    expect(issues.some((issue) => issue.includes('ownership checksum'))).toBe(true);
  });

  test('accepts PostgreSQL casts in a varchar visibility predicate', () => {
    const definition = SEARCH_FTS_INDEXES.find(({ tableName }) => tableName === 'tourist_places');
    expect(definition).toBeDefined();
    if (!definition) return;

    const entry = createCatalogEntry(definition, {
      predicate: "((deleted_at IS NULL) AND ((status)::text = 'active'::text))",
    });
    expect(validateIndexCatalogEntry(definition, entry)).toEqual([]);
  });
});

describe('Vietnamese FTS migration runner', () => {
  test('requires an explicit safe mode', () => {
    expect(parseSearchFtsMigrationMode(['--check'])).toBe('check');
    expect(parseSearchFtsMigrationMode(['--apply'])).toBe('apply');
    expect(() => parseSearchFtsMigrationMode([])).toThrow(SearchFtsMigrationError);
    expect(() => parseSearchFtsMigrationMode(['--apply', '--check'])).toThrow(
      SearchFtsMigrationError
    );
  });

  test('blocks apply when a required semantic check fails', () => {
    const environment = createEnvironment({
      semantic: {
        ...createEnvironment().semantic,
        nfdDocumentMatches: false,
      },
    });
    expect(validateEnvironment(environment, 'apply')).toContain(
      'NFD Vietnamese document parity failed'
    );
  });

  test('check mode fails when any required index is missing', async () => {
    const store = new FakeSearchFtsIndexStore(createEnvironment());

    await expect(runSearchFtsIndexMigration(store, 'check')).rejects.toBeInstanceOf(
      SearchFtsMigrationError
    );
    expect(store.created).toEqual([]);
  });

  test('apply mode builds missing indexes sequentially and analyzes their tables', async () => {
    const store = new FakeSearchFtsIndexStore(createEnvironment());
    const existing = SEARCH_FTS_INDEXES[0];
    expect(existing).toBeDefined();
    if (!existing) return;
    store.entries.set(existing.indexName, createCatalogEntry(existing));

    const report = await runSearchFtsIndexMigration(store, 'apply');

    expect(report.indexes).toHaveLength(4);
    expect(store.created).toEqual(SEARCH_FTS_INDEXES.slice(1).map(({ indexName }) => indexName));
    expect(store.analyzed).toEqual(SEARCH_FTS_INDEXES.slice(1).map(({ tableName }) => tableName));
    expect(store.lockReleased).toBe(true);
  });
});
