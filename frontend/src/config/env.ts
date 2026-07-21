import { z } from "zod";

const envSchema = z.object({
  PUBLIC_SITE_URL: z
    .string()
    .url()
    .refine((value) => !value.endsWith("/"), "PUBLIC_SITE_URL must not end with a trailing slash"),
  INTERNAL_BACKEND_URL: z
    .string()
    .url()
    .refine((value) => !value.endsWith("/"), "INTERNAL_BACKEND_URL must not end with a trailing slash"),
  REDIRECT_RESOLVER_TIMEOUT_MS: z.coerce.number().int().min(100).max(5000).default(1000),
  API_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(8000),
  AUTH_LOGIN_PATH: z.string().regex(/^\/api\/[A-Za-z0-9/_-]+$/).default("/api/v1/auth/login"),
  AUTH_REFRESH_PATH: z.string().regex(/^\/api\/[A-Za-z0-9/_-]+$/).default("/api/v1/auth/refresh"),
  AUTH_LOGOUT_PATH: z.string().regex(/^\/api\/[A-Za-z0-9/_-]+$/).default("/api/v1/auth/logout"),
  AUTH_REFRESH_TOKEN_FIELD: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/).default("refreshToken"),
  AUTH_ACCESS_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("hsp_access"),
  AUTH_REFRESH_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("hsp_refresh"),
  AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  AUTH_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(31536000).default(2592000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function validateEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const developmentDefaults =
    nodeEnv === "development" || nodeEnv === "test"
      ? {
          PUBLIC_SITE_URL: "http://localhost:3001",
          INTERNAL_BACKEND_URL: "http://localhost:3000",
        }
      : {};

  const parsed = envSchema.safeParse({
    ...developmentDefaults,
    ...process.env,
    NODE_ENV: nodeEnv,
  });

  if (!parsed.success) {
    const invalidKeys = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(`Invalid environment variables: ${invalidKeys || "unknown"}`);
  }

  return parsed.data;
}

export const env = validateEnv();
