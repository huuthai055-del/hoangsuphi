import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const ADMIN_URL =
  process.env.MEDIA_MIGRATION_AUDIT_ADMIN_URL ??
  'postgres://postgres:postgres@localhost:5432/postgres';
const DATABASE_NAMES = {
  fresh: 'hoangsuphi_media_audit_fresh',
  legacy: 'hoangsuphi_media_audit_legacy',
} as const;
const migrationsFolder = fileURLToPath(
  new URL('../../../lib/database/migrations', import.meta.url)
);

interface AuditResult {
  database: string;
  migrationMode: 'fresh' | 'legacy-upgrade';
  columns: Array<{ name: string; nullable: boolean; maxLength: number | null }>;
  constraints: string[];
  indexes: Array<{ name: string; valid: boolean; ready: boolean; unique: boolean }>;
  mediaLinksPresent: boolean;
  legacyRow?: { storageProvider: string; altText: string | null; caption: string | null };
}

function assertAuditDatabaseName(name: string): void {
  if (!/^hoangsuphi_media_audit_[a-z]+$/u.test(name)) {
    throw new Error(`Refusing unsafe audit database name: ${name}`);
  }
}

async function createDatabase(admin: postgres.Sql, name: string): Promise<void> {
  assertAuditDatabaseName(name);
  const existing = await admin<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name}) AS exists
  `;
  if (existing[0]?.exists) {
    throw new Error(`Audit database already exists; refusing to overwrite it: ${name}`);
  }
  await admin.unsafe(`CREATE DATABASE "${name}"`);
}

async function dropDatabase(admin: postgres.Sql, name: string): Promise<void> {
  assertAuditDatabaseName(name);
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

function databaseUrl(name: string): string {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

async function createLegacyMigrationFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'hsp-media-migration-audit-'));
  await mkdir(join(folder, 'meta'), { recursive: true });
  const journalPath = join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    version: string;
    dialect: string;
    entries: Array<{ idx: number }>;
  };
  journal.entries = journal.entries.filter((entry) => entry.idx <= 15);
  await writeFile(join(folder, 'meta', '_journal.json'), JSON.stringify(journal, null, 2));

  for (const fileName of await readdir(migrationsFolder)) {
    const match = /^(\d{4})_.+\.sql$/u.exec(fileName);
    if (match && Number.parseInt(match[1] ?? '', 10) <= 15) {
      await cp(join(migrationsFolder, fileName), join(folder, fileName));
    }
  }
  return folder;
}

async function applyProductionIndexes(client: postgres.Sql): Promise<void> {
  const statements = [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "media_scoped_hash_idx" ON "media" ("uploaded_by", "owner_type", "owner_id", "hash")',
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_unbound_active_hash_unique_idx"
      ON "media" ("uploaded_by", "hash")
      WHERE "owner_type" IS NULL AND "owner_id" IS NULL AND "deleted_at" IS NULL
        AND "status" IN ('UPLOADING', 'PROCESSING', 'READY')`,
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_variants_media_id_variant_type_unique_idx" ON "media_variants" ("media_id", "variant_type")',
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_metadata_media_id_unique_idx" ON "media_metadata" ("media_id")',
  ];
  for (const statement of statements) await client.unsafe(statement);
  await client.unsafe('ANALYZE "media"');
  await client.unsafe('ANALYZE "media_variants"');
  await client.unsafe('ANALYZE "media_metadata"');
}

async function initializeProjectExtensions(client: postgres.Sql): Promise<void> {
  await client.unsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await client.unsafe('CREATE EXTENSION IF NOT EXISTS "postgis"');
  await client.unsafe('CREATE EXTENSION IF NOT EXISTS "ltree"');
}

async function inspectDatabase(
  client: postgres.Sql,
  database: string,
  migrationMode: AuditResult['migrationMode']
): Promise<AuditResult> {
  const columns = await client<
    Array<{
      name: string;
      nullable: boolean;
      maxLength: number | null;
      defaultValue: string | null;
    }>
  >`
    SELECT
      column_name AS name,
      (is_nullable = 'YES') AS nullable,
      character_maximum_length::integer AS "maxLength",
      column_default AS "defaultValue"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'media'
      AND column_name IN ('storage_provider', 'alt_text', 'caption')
    ORDER BY column_name
  `;
  const columnByName = new Map(columns.map((column) => [column.name, column]));
  if (
    columns.length !== 3 ||
    columnByName.get('storage_provider')?.nullable !== false ||
    columnByName.get('storage_provider')?.maxLength !== 50 ||
    !columnByName.get('storage_provider')?.defaultValue?.includes('LOCAL') ||
    columnByName.get('alt_text')?.maxLength !== 255 ||
    columnByName.get('caption')?.maxLength !== 500
  ) {
    throw new Error(`Column drift detected in ${database}`);
  }

  const expectedConstraints = [
    'media_active_unbound_uploader_check',
    'media_owner_pair_check',
    'media_storage_provider_check',
  ];
  const constraints = await client<{ name: string }[]>`
    SELECT conname AS name
    FROM pg_constraint
    WHERE conrelid = 'media'::regclass
      AND conname = ANY(${expectedConstraints})
    ORDER BY conname
  `;
  if (constraints.length !== expectedConstraints.length) {
    throw new Error(`Constraint drift detected in ${database}`);
  }

  const expectedIndexes = [
    'media_scoped_hash_idx',
    'media_unbound_active_hash_unique_idx',
    'media_variants_media_id_variant_type_unique_idx',
    'media_metadata_media_id_unique_idx',
  ];
  const indexes = await client<
    Array<{
      name: string;
      valid: boolean;
      ready: boolean;
      unique: boolean;
      predicate: string | null;
    }>
  >`
    SELECT
      c.relname AS name,
      i.indisvalid AS valid,
      i.indisready AS ready,
      i.indisunique AS "unique",
      pg_get_expr(i.indpred, i.indrelid) AS predicate
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = ANY(${expectedIndexes})
    ORDER BY c.relname
  `;
  if (
    indexes.length !== expectedIndexes.length ||
    indexes.some((index) => !index.valid || !index.ready) ||
    indexes.find((index) => index.name === 'media_scoped_hash_idx')?.unique !== false ||
    indexes.filter((index) => index.name !== 'media_scoped_hash_idx').some((index) => !index.unique)
  ) {
    throw new Error(`Index drift detected in ${database}`);
  }
  const dedupPredicate = indexes.find(
    (index) => index.name === 'media_unbound_active_hash_unique_idx'
  )?.predicate;
  for (const requiredFragment of [
    'owner_type IS NULL',
    'owner_id IS NULL',
    'deleted_at IS NULL',
    'UPLOADING',
    'PROCESSING',
    'READY',
  ]) {
    if (!dedupPredicate?.includes(requiredFragment)) {
      throw new Error(`Scoped dedup predicate drift detected in ${database}`);
    }
  }

  const [mediaLinks] = await client<{ present: boolean }[]>`
    SELECT to_regclass('public.media_links') IS NOT NULL AS present
  `;

  return {
    database,
    migrationMode,
    columns: columns.map(({ name, nullable, maxLength }) => ({ name, nullable, maxLength })),
    constraints: constraints.map((constraint) => constraint.name),
    indexes: indexes.map(({ name, valid, ready, unique }) => ({ name, valid, ready, unique })),
    mediaLinksPresent: mediaLinks?.present ?? false,
  };
}

async function runFreshAudit(admin: postgres.Sql): Promise<AuditResult> {
  const name = DATABASE_NAMES.fresh;
  await createDatabase(admin, name);
  const client = postgres(databaseUrl(name), { max: 1, onnotice: () => undefined });
  try {
    await initializeProjectExtensions(client);
    await migrate(drizzle(client), { migrationsFolder });
    await applyProductionIndexes(client);
    return await inspectDatabase(client, name, 'fresh');
  } finally {
    await client.end();
  }
}

async function runLegacyAudit(admin: postgres.Sql): Promise<AuditResult> {
  const name = DATABASE_NAMES.legacy;
  const legacyFolder = await createLegacyMigrationFolder();
  await createDatabase(admin, name);
  const client = postgres(databaseUrl(name), { max: 1, onnotice: () => undefined });
  try {
    await initializeProjectExtensions(client);
    await migrate(drizzle(client), { migrationsFolder: legacyFolder });
    await client.unsafe(`
      INSERT INTO media (
        id, file_name, storage_key, mime_type, media_type, file_size, hash, status,
        owner_type, owner_id, uploaded_by, created_at, updated_at, deleted_at
      ) VALUES (
        '019f6c00-0000-7000-8000-000000000001', 'legacy.jpg',
        'uploads/legacy/legacy.jpg', 'image/jpeg', 'IMAGE', 128,
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'READY',
        'ARTICLE', '019f6c00-0000-7000-8000-000000000002', NULL, NOW(), NOW(), NULL
      )
    `);
    await migrate(drizzle(client), { migrationsFolder });
    await applyProductionIndexes(client);
    const result = await inspectDatabase(client, name, 'legacy-upgrade');
    const [legacyRow] = await client<
      Array<{ storageProvider: string; altText: string | null; caption: string | null }>
    >`
      SELECT storage_provider AS "storageProvider", alt_text AS "altText", caption
      FROM media
      WHERE id = '019f6c00-0000-7000-8000-000000000001'
    `;
    if (!legacyRow || legacyRow.storageProvider !== 'LOCAL') {
      throw new Error('Legacy LOCAL compatibility check failed');
    }
    result.legacyRow = legacyRow;
    return result;
  } finally {
    await client.end();
    await rm(legacyFolder, { recursive: true, force: true });
  }
}

const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => undefined });
try {
  const fresh = await runFreshAudit(admin);
  const legacy = await runLegacyAudit(admin);
  console.log(JSON.stringify({ fresh, legacy }, null, 2));
} finally {
  for (const name of [DATABASE_NAMES.fresh, DATABASE_NAMES.legacy]) {
    try {
      await dropDatabase(admin, name);
    } catch (error: unknown) {
      console.error(
        `Failed to remove audit database ${name}:`,
        error instanceof Error ? error.name : 'Error'
      );
    }
  }
  await admin.end();
}
