import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/database/schema/index.ts',
  out: './src/lib/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hoangsuphi',
  },
});
