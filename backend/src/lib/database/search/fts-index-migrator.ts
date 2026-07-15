import {
  SEARCH_FTS_CONFIGURATION_MARKER,
  SEARCH_FTS_INDEXES,
  SEARCH_FTS_WORD_TOKEN_TYPES,
  type SearchFtsIndexDefinition,
  type SearchFieldWeight,
} from './fts-index-manifest';

export type SearchFtsMigrationMode = 'check' | 'apply';

export interface SearchFtsSemanticAudit {
  readonly accentedQueryMatches: boolean;
  readonly dStrokeQueryMatches: boolean;
  readonly nfdDocumentMatches: boolean;
  readonly slugQueryMatches: boolean;
  readonly punctuationParserSafe: boolean;
  readonly punctuationOnlyProducesEmptyQuery: boolean;
}

export interface SearchFtsEnvironmentAudit {
  readonly serverVersionNum: number;
  readonly databaseName: string;
  readonly userName: string;
  readonly transactionReadOnly: boolean;
  readonly unaccentVersion: string | null;
  readonly unaccentSchema: string | null;
  readonly configurationExists: boolean;
  readonly configurationMarker: string | null;
  readonly tokenMappings: Readonly<Record<string, readonly string[]>>;
  readonly missingColumns: readonly string[];
  readonly manageableTables: Readonly<Record<string, boolean>>;
  readonly semantic: SearchFtsSemanticAudit;
}

export interface SearchFtsIndexCatalogEntry {
  readonly schemaName: string;
  readonly tableName: string;
  readonly accessMethod: string;
  readonly isValid: boolean;
  readonly isReady: boolean;
  readonly definition: string;
  readonly expression: string | null;
  readonly predicate: string | null;
  readonly ownershipMarker: string | null;
}

export interface SearchFtsIndexStore {
  inspectEnvironment(): Promise<SearchFtsEnvironmentAudit>;
  tryAcquireMigrationLock(): Promise<boolean>;
  releaseMigrationLock(): Promise<void>;
  inspectIndex(definition: SearchFtsIndexDefinition): Promise<SearchFtsIndexCatalogEntry | null>;
  createIndex(definition: SearchFtsIndexDefinition): Promise<void>;
  analyzeTable(definition: SearchFtsIndexDefinition): Promise<void>;
}

export interface SearchFtsIndexResult {
  readonly indexName: string;
  readonly status: 'ready' | 'created';
}

export interface SearchFtsMigrationReport {
  readonly environment: SearchFtsEnvironmentAudit;
  readonly indexes: readonly SearchFtsIndexResult[];
}

export class SearchFtsMigrationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = 'SearchFtsMigrationError';
    this.issues = issues;
  }
}

function normalizeCatalogSql(value: string): string {
  return value.toLowerCase().replaceAll('"', '').replace(/\s+/g, ' ').trim();
}

function normalizeCatalogPredicate(value: string): string {
  return normalizeCatalogSql(value)
    .replace(/::[a-z_][a-z0-9_.]*/g, '')
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

function countWeight(expression: string, weight: SearchFieldWeight): number {
  const pattern = new RegExp(`'${weight.toLowerCase()}'(?:::char)?`, 'g');
  return expression.match(pattern)?.length ?? 0;
}

function expectedWeightCount(
  definition: SearchFtsIndexDefinition,
  weight: SearchFieldWeight
): number {
  return definition.fieldWeights.filter(([, fieldWeight]) => fieldWeight === weight).length;
}

export function validateIndexCatalogEntry(
  definition: SearchFtsIndexDefinition,
  entry: SearchFtsIndexCatalogEntry
): string[] {
  const issues: string[] = [];

  if (entry.schemaName !== definition.schemaName || entry.tableName !== definition.tableName) {
    issues.push(`${definition.indexName}: index name is attached to an unexpected table`);
  }
  if (entry.accessMethod !== 'gin') {
    issues.push(`${definition.indexName}: expected GIN, found ${entry.accessMethod}`);
  }
  if (!entry.isValid || !entry.isReady) {
    issues.push(
      `${definition.indexName}: index is invalid or not ready; use the approved recovery runbook`
    );
  }
  if (entry.ownershipMarker !== definition.ownershipMarker) {
    issues.push(`${definition.indexName}: ownership checksum does not match the Phase 4 manifest`);
  }

  const expression = normalizeCatalogSql(entry.expression ?? entry.definition);
  if (!expression.includes('hsp_vietnamese')) {
    issues.push(`${definition.indexName}: expression does not use hsp_vietnamese`);
  }

  for (const [field] of definition.fieldWeights) {
    if (!expression.includes(field.toLowerCase())) {
      issues.push(`${definition.indexName}: expression is missing field ${field}`);
    }
  }

  if (countOccurrences(expression, 'to_tsvector') !== definition.fieldWeights.length) {
    issues.push(`${definition.indexName}: document segment count does not match the manifest`);
  }

  for (const weight of ['A', 'B', 'C', 'D'] as const) {
    if (countWeight(expression, weight) !== expectedWeightCount(definition, weight)) {
      issues.push(`${definition.indexName}: weight ${weight} count does not match the manifest`);
    }
  }

  const predicate = normalizeCatalogPredicate(entry.predicate ?? '');
  for (const fragment of definition.predicateFragments) {
    if (!predicate.includes(normalizeCatalogPredicate(fragment))) {
      issues.push(`${definition.indexName}: predicate is missing ${fragment}`);
    }
  }

  return issues;
}

export function validateEnvironment(
  environment: SearchFtsEnvironmentAudit,
  mode: SearchFtsMigrationMode
): string[] {
  const issues: string[] = [];

  if (Math.floor(environment.serverVersionNum / 10000) !== 17) {
    issues.push(`PostgreSQL 17.x is required; server_version_num=${environment.serverVersionNum}`);
  }
  if (!environment.unaccentVersion || environment.unaccentSchema !== 'public') {
    issues.push('unaccent must be installed in the public schema by migration 0013');
  }
  if (
    !environment.configurationExists ||
    environment.configurationMarker !== SEARCH_FTS_CONFIGURATION_MARKER
  ) {
    issues.push('public.hsp_vietnamese is missing or has an unexpected ownership marker');
  }

  const expectedChain = ['public.unaccent', 'pg_catalog.simple'];
  for (const tokenType of SEARCH_FTS_WORD_TOKEN_TYPES) {
    const actualChain = environment.tokenMappings[tokenType] ?? [];
    if (
      actualChain.length !== expectedChain.length ||
      actualChain.some((dictionary, index) => dictionary !== expectedChain[index])
    ) {
      issues.push(`${tokenType}: expected dictionary chain ${expectedChain.join(' -> ')}`);
    }
  }

  for (const missingColumn of environment.missingColumns) {
    issues.push(`Required search source column is missing: ${missingColumn}`);
  }

  const semanticChecks: ReadonlyArray<readonly [boolean, string]> = [
    [environment.semantic.accentedQueryMatches, 'accented/unaccented Vietnamese parity failed'],
    [environment.semantic.dStrokeQueryMatches, 'đ/Đ to d/D parity failed'],
    [environment.semantic.nfdDocumentMatches, 'NFD Vietnamese document parity failed'],
    [environment.semantic.slugQueryMatches, 'slug tokenization verification failed'],
    [
      environment.semantic.punctuationParserSafe,
      'websearch punctuation parser verification failed',
    ],
  ];
  for (const [passed, message] of semanticChecks) {
    if (!passed) {
      issues.push(message);
    }
  }

  if (mode === 'apply') {
    if (environment.transactionReadOnly) {
      issues.push('The database session is read-only; concurrent indexes cannot be created');
    }
    for (const definition of SEARCH_FTS_INDEXES) {
      if (!environment.manageableTables[definition.tableName]) {
        issues.push(`Current role cannot manage indexes on public.${definition.tableName}`);
      }
    }
  }

  return issues;
}

export function parseSearchFtsMigrationMode(args: readonly string[]): SearchFtsMigrationMode {
  if (args.length !== 1 || (args[0] !== '--check' && args[0] !== '--apply')) {
    throw new SearchFtsMigrationError('Invalid Search FTS migration mode', [
      'Use exactly one explicit mode: --check or --apply',
    ]);
  }

  return args[0] === '--apply' ? 'apply' : 'check';
}

export async function runSearchFtsIndexMigration(
  store: SearchFtsIndexStore,
  mode: SearchFtsMigrationMode
): Promise<SearchFtsMigrationReport> {
  const environment = await store.inspectEnvironment();
  const environmentIssues = validateEnvironment(environment, mode);
  if (environmentIssues.length > 0) {
    throw new SearchFtsMigrationError('Search FTS preflight failed', environmentIssues);
  }

  let lockAcquired = false;
  if (mode === 'apply') {
    lockAcquired = await store.tryAcquireMigrationLock();
    if (!lockAcquired) {
      throw new SearchFtsMigrationError('Search FTS index migration is already running', [
        'Another session owns the Phase 4 Search migration advisory lock',
      ]);
    }
  }

  try {
    const inspected = await Promise.all(
      SEARCH_FTS_INDEXES.map(async (definition) => ({
        definition,
        entry: await store.inspectIndex(definition),
      }))
    );
    const catalogIssues = inspected.flatMap(({ definition, entry }) =>
      entry ? validateIndexCatalogEntry(definition, entry) : []
    );

    if (catalogIssues.length > 0) {
      throw new SearchFtsMigrationError(
        'Search FTS index catalog validation failed',
        catalogIssues
      );
    }

    const missing = inspected.filter(
      (item): item is { definition: SearchFtsIndexDefinition; entry: null } => item.entry === null
    );
    if (mode === 'check' && missing.length > 0) {
      throw new SearchFtsMigrationError(
        'Required Search FTS indexes are missing',
        missing.map(({ definition }) => definition.indexName)
      );
    }

    const results: SearchFtsIndexResult[] = inspected
      .filter(({ entry }) => entry !== null)
      .map(({ definition }) => ({ indexName: definition.indexName, status: 'ready' }));

    for (const { definition } of missing) {
      await store.createIndex(definition);
      const createdEntry = await store.inspectIndex(definition);
      if (!createdEntry) {
        throw new SearchFtsMigrationError('Concurrent index build did not create an index', [
          definition.indexName,
        ]);
      }

      const createdIssues = validateIndexCatalogEntry(definition, createdEntry);
      if (createdIssues.length > 0) {
        throw new SearchFtsMigrationError(
          `Concurrent index validation failed: ${definition.indexName}`,
          createdIssues
        );
      }
      await store.analyzeTable(definition);
      results.push({ indexName: definition.indexName, status: 'created' });
    }

    return { environment, indexes: results };
  } finally {
    if (lockAcquired) {
      await store.releaseMigrationLock();
    }
  }
}
