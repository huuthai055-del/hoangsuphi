import type { MiddlewareHandler } from 'hono';
import { logger, requestStore } from '@/lib/logger';

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

      logger.info(
        {
          req: {
            method,
            url,
            headers: c.req.header(),
            correlationId,
          },
        },
        `📥 HTTP ${method} ${url} started`
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
          `❌ HTTP ${method} ${url} failed`
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
          `📤 HTTP ${method} ${url} finished - ${status} (${durationMs}ms)`
        );
      }
    });
  };
};
