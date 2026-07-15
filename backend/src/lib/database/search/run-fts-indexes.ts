import postgres from 'postgres';
import {
  SearchFtsMigrationError,
  parseSearchFtsMigrationMode,
  runSearchFtsIndexMigration,
} from './fts-index-migrator';
import { PostgresSearchFtsIndexStore } from './postgres-fts-index-store';

async function main(): Promise<void> {
  const mode = parseSearchFtsMigrationMode(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new SearchFtsMigrationError('DATABASE_URL is required', [
      'Set DATABASE_URL explicitly before running a Search FTS database operation',
    ]);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    onnotice: () => undefined,
  });

  try {
    const store = new PostgresSearchFtsIndexStore(sql);
    const report = await runSearchFtsIndexMigration(store, mode);

    console.info(
      `Search FTS ${mode} succeeded on PostgreSQL ${report.environment.serverVersionNum} ` +
        `database=${report.environment.databaseName} role=${report.environment.userName}`
    );
    for (const index of report.indexes) {
      console.info(`${index.status.toUpperCase()}: ${index.indexName}`);
    }
    if (report.environment.semantic.punctuationOnlyProducesEmptyQuery) {
      console.info(
        'INFO: punctuation-only q produces an empty tsquery; SearchService resolves it as 400 VAL_001'
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof SearchFtsMigrationError) {
    console.error(error.message);
    for (const issue of error.issues) {
      console.error(`- ${issue}`);
    }
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Search FTS database operation failed: ${message}`);
  }
  process.exitCode = 1;
}
