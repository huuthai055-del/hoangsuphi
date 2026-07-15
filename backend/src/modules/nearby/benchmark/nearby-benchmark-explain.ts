import fs from 'node:fs';
import path from 'node:path';
import type { Database } from '@/lib/database/client';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type postgres from 'postgres';
import type { NearbySearchCriteria } from '../repository/nearby-repository.interface';
import { DrizzleNearbyRepository } from '../repository/nearby.repository';

interface ExplainScenario {
  fileName: string;
  criteria: NearbySearchCriteria;
}

interface CompiledRepositoryQuery {
  sql: string;
  params: unknown[];
}

async function compileRepositorySearch(
  criteria: NearbySearchCriteria
): Promise<CompiledRepositoryQuery> {
  let capturedQuery: SQL | undefined;
  const captureDatabase = {
    execute: async <TRow extends Record<string, unknown>>(query: SQL): Promise<TRow[]> => {
      capturedQuery = query;
      return [];
    },
  } as unknown as Database;

  await new DrizzleNearbyRepository(captureDatabase).searchNearby(criteria);
  if (!capturedQuery) {
    throw new Error('Nearby repository did not execute a query while generating EXPLAIN evidence');
  }

  const compiled = new PgDialect().sqlToQuery(capturedQuery);
  return { sql: compiled.sql, params: compiled.params };
}

function assertCurrentRepositoryPlan(planText: string, fileName: string): void {
  if (!planText.includes('actual time=')) {
    throw new Error(`${fileName}: EXPLAIN ANALYZE evidence is missing execution metrics`);
  }
  if (planText.includes('nearby_ratings')) {
    throw new Error(`${fileName}: evidence was generated from the obsolete global ratings CTE`);
  }
  const topLevelRows = planText.match(/actual time=[^)]* rows=(\d+)/)?.[1];
  if (!topLevelRows || Number.parseInt(topLevelRows, 10) < 1) {
    throw new Error(`${fileName}: representative EXPLAIN returned no rows`);
  }
}

export async function generateRepositoryExplainEvidence(
  client: postgres.Sql,
  scenarios: readonly ExplainScenario[],
  evidenceDirectory: string
): Promise<void> {
  fs.mkdirSync(evidenceDirectory, { recursive: true });

  for (const scenario of scenarios) {
    const compiled = await compileRepositorySearch(scenario.criteria);
    if (!compiled.sql.toUpperCase().includes('LATERAL')) {
      throw new Error(`${scenario.fileName}: compiled repository query is missing LATERAL`);
    }
    const rows = await client.unsafe<Record<string, string>[]>(
      `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS) ${compiled.sql}`,
      compiled.params as Parameters<typeof client.unsafe>[1]
    );
    const planText = rows.map((row) => row['QUERY PLAN'] ?? '').join('\n');
    assertCurrentRepositoryPlan(planText, scenario.fileName);
    fs.writeFileSync(path.join(evidenceDirectory, scenario.fileName), planText, 'utf8');
  }
}
