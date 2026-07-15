export type {};

const mode = process.argv[2];
const validModes = [
  '--seed',
  '--run',
  '--smoke',
  '--prototype-apply',
  '--prototype-write',
  '--prototype-run',
  '--prototype-smoke',
  '--bounded-run',
  '--bounded-smoke',
  '--per-entity-run',
  '--per-entity-smoke',
] as const;
if (!validModes.includes(mode as (typeof validModes)[number])) {
  console.error(
    'Use exactly one mode: --seed, --run, --smoke, --prototype-apply, --prototype-write, --prototype-run, --prototype-smoke, --bounded-run, --bounded-smoke, --per-entity-run, or --per-entity-smoke'
  );
  process.exit(1);
}

const benchmarkDatabaseUrl = process.env.SEARCH_BENCHMARK_DATABASE_URL;
if (!benchmarkDatabaseUrl) {
  console.error('SEARCH_BENCHMARK_DATABASE_URL is required');
  process.exit(1);
}

const { assertDedicatedBenchmarkDatabase, readBenchmarkOptions } = await import(
  './search-benchmark.model'
);
assertDedicatedBenchmarkDatabase(benchmarkDatabaseUrl);

// Production modules read DATABASE_URL during import. Override only inside this benchmark process.
process.env.DATABASE_URL = benchmarkDatabaseUrl;
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_ANON_MAX = '1000000';
process.env.RATE_LIMIT_AUTH_MAX = '1000000';

if (mode === '--seed') {
  const { seedSearchBenchmarkDatabase } = await import('./search-benchmark.seed');
  await seedSearchBenchmarkDatabase(benchmarkDatabaseUrl);
} else if (mode === '--prototype-apply') {
  const { applyStoredVectorBenchmarkPrototype } = await import('./search-benchmark.prototype');
  const report = await applyStoredVectorBenchmarkPrototype(benchmarkDatabaseUrl);
  console.info(JSON.stringify(report, null, 2));
} else if (mode === '--prototype-write') {
  const { measureSearchBenchmarkWriteImpact } = await import('./search-benchmark.prototype');
  const report = await measureSearchBenchmarkWriteImpact(benchmarkDatabaseUrl);
  console.info(JSON.stringify(report, null, 2));
} else {
  const { runSearchBenchmark } = await import('./search-benchmark.runner');
  const isPrototype = mode === '--prototype-run' || mode === '--prototype-smoke';
  const isBounded = mode === '--bounded-run' || mode === '--bounded-smoke';
  const isPerEntity = mode === '--per-entity-run' || mode === '--per-entity-smoke';
  const report = await runSearchBenchmark(
    benchmarkDatabaseUrl,
    readBenchmarkOptions(
      mode === '--smoke' ||
        mode === '--prototype-smoke' ||
        mode === '--bounded-smoke' ||
        mode === '--per-entity-smoke',
      isPrototype || isBounded || isPerEntity ? 'stored' : 'expression',
      isBounded ? 'bounded' : isPerEntity ? 'per_entity_exact' : 'exact'
    )
  );
  console.info(JSON.stringify(report, null, 2));
  process.exit(0);
}
