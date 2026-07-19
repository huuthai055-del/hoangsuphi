import { z } from 'zod';

const envSchema = z.object({
  PUBLIC_SITE_URL: z.string().url().refine(s => !s.endsWith('/'), 'PUBLIC_SITE_URL must not end with a trailing slash'),
  INTERNAL_BACKEND_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const validateEnv = () => {
  // If we are in dev/test, and it's missing, let's inject it into process.env so safeParse passes
  const nodeEnv = process.env.NODE_ENV || 'development';
  if ((nodeEnv === 'development' || nodeEnv === 'test') && !process.env.PUBLIC_SITE_URL) {
    process.env.PUBLIC_SITE_URL = 'http://localhost:3001';
  }

  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See above for details.');
  }
  
  return parsed.data;
};

export const env = validateEnv();
