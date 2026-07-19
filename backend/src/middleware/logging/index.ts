import { logger, requestStore } from '@/lib/logger';
import type { MiddlewareHandler } from 'hono';

const SENSITIVE_REQUEST_HEADERS = new Set([
  'authorization',
  'cookie',
  'idempotency-key',
  'x-api-key',
]);

const SENSITIVE_QUERY_PARAMETERS = new Set([
  'access_token',
  'accesstoken',
  'authorization',
  'idempotency_key',
  'idempotencykey',
  'password',
  'refresh_token',
  'refreshtoken',
  'token',
]);

export function redactRequestHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      SENSITIVE_REQUEST_HEADERS.has(name.toLowerCase()) ? '[REDACTED]' : value,
    ])
  );
}

export const loggerMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const correlationId =
      c.req.header('x-correlation-id') || c.req.header('x-request-id') || crypto.randomUUID();
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();

    c.res.headers.set('x-request-id', requestId);
    c.res.headers.set('x-correlation-id', correlationId);

    return requestStore.run({ requestId }, async () => {
      const start = performance.now();
      const { method, url } = c.req;
      const redactedUrl = redactSensitiveUrl(url);

      logger.info(
        {
          req: {
            method,
            url: redactedUrl,
            headers: redactRequestHeaders(c.req.header()),
            correlationId,
          },
        },
        `📥 HTTP ${method} ${redactedUrl} started`
      );

      try {
        await next();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(
          {
            err: {
              message: error.message,
              stack: error.stack,
            },
            correlationId,
          },
          `❌ HTTP ${method} ${redactedUrl} failed`
        );
        throw err;
      } finally {
        const durationMs = Math.round(performance.now() - start);
        const status = c.res.status;
        const memoryUsage = process.memoryUsage().heapUsed;

        logger.info(
          {
            res: {
              status,
              durationMs,
              metrics: {
                memoryHeapUsedBytes: memoryUsage,
              },
            },
            correlationId,
          },
          `📤 HTTP ${method} ${redactedUrl} finished - ${status} (${durationMs}ms)`
        );
      }
    });
  };
};

export function redactSensitiveUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    let changed = false;

    for (const [name] of url.searchParams) {
      const normalizedName = name.toLowerCase().replace(/-/gu, '_');
      if (
        normalizedName === 'lat' ||
        normalizedName === 'lng' ||
        normalizedName === 'cursor' ||
        SENSITIVE_QUERY_PARAMETERS.has(normalizedName)
      ) {
        url.searchParams.set(name, '[REDACTED]');
        changed = true;
      }
    }

    return changed ? url.toString() : urlString;
  } catch {
    return urlString
      .replace(/([?&])lat=[^&]*/gi, '$1lat=[REDACTED]')
      .replace(/([?&])lng=[^&]*/gi, '$1lng=[REDACTED]')
      .replace(/([?&])cursor=[^&]*/gi, '$1cursor=[REDACTED]')
      .replace(/([?&])(?:access[_-]?token|authorization|idempotency[_-]?key|password|refresh[_-]?token|token)=[^&]*/gi, '$1[REDACTED]');
  }
}
