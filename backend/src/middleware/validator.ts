import type { MiddlewareHandler } from 'hono';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '@/common/errors/http.errors';

export function validateBody(schema: ZodTypeAny): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        details[path] = issue.message;
      }
      throw new ValidationError('Validation failed', details);
    }
    c.set('validBody', result.data);
    await next();
  };
}

export function validateQuery(schema: ZodTypeAny): MiddlewareHandler {
  return async (c, next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        details[path] = issue.message;
      }
      throw new ValidationError('Validation failed', details);
    }
    c.set('validQuery', result.data);
    await next();
  };
}

export function validateParams(schema: ZodTypeAny): MiddlewareHandler {
  return async (c, next) => {
    const params = c.req.param();
    const result = schema.safeParse(params);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        details[path] = issue.message;
      }
      throw new ValidationError('Validation failed', details);
    }
    c.set('validParams', result.data);
    await next();
  };
}
