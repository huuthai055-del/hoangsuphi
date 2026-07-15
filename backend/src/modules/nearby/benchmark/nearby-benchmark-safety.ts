export function requireDedicatedBenchmarkDatabase(databaseUrl: string): string {
  let databaseName: string;
  try {
    databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
  } catch (error) {
    throw new Error('NEARBY_BENCHMARK_DATABASE_URL must be a valid PostgreSQL URL', {
      cause: error,
    });
  }

  if (!databaseName.endsWith('_benchmark')) {
    throw new Error(
      `Refusing benchmark operation on database "${databaseName}". The database name must end with "_benchmark".`
    );
  }
  return databaseName;
}
