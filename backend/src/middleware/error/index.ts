import { AppError } from '@/common/errors/app.error';
import { isProd } from '@/config/env';
import { logger } from '@/lib/logger';
import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const errorHandlerMiddleware = (): ErrorHandler => {
  return async (err, c) => {
    const instance = c.req.path;
    const traceId = c.res.headers.get('x-request-id') || 'unknown';

    if (err instanceof AppError) {
      const isClientError = err.statusCode < 500;
      const logPayload = {
        statusCode: err.statusCode,
        errorCode: err.errorCode,
        detail: err.message,
        details: err.details,
        instance,
        traceId,
        cause:
          err.cause instanceof Error
            ? { message: err.cause.message, stack: err.cause.stack }
            : undefined,
      };

      if (isClientError) {
        logger.warn(logPayload, `⚠️ Client Error: ${err.message}`);
      } else {
        logger.error({ ...logPayload, stack: err.stack }, `❌ Server Error: ${err.message}`);
      }

      return c.json(
        {
          type: err.typeUri,
          title: err.name.replace(/Error$/, ' Failed'),
          status: err.statusCode,
          code: err.errorCode,
          detail: err.message,
          instance,
          traceId,
          retryable: err.retryable,
          ...(err.details ? { invalidParams: formatInvalidParams(err.details) } : {}),
        },
        err.statusCode as ContentfulStatusCode,
        { 'Content-Type': 'application/problem+json' }
      );
    }

    if (err.name === 'ZodError') {
      logger.warn({ err: err.message, instance, traceId }, '⚠️ Unhandled Zod validation error');
      return c.json(
        {
          type: 'https://hoangsuphi.vn/errors/validation-failed',
          title: 'Validation Failed',
          status: 400,
          code: 'VAL_001',
          detail: 'Invalid input parameters',
          instance,
          traceId,
          retryable: false,
        },
        400,
        { 'Content-Type': 'application/problem+json' }
      );
    }

    logger.error(
      { err: err.message, stack: err.stack, instance, traceId },
      '🚨 Unhandled System Exception'
    );

    const responseDetail = isProd
      ? 'An unexpected system error occurred. Please contact system administrator.'
      : err.message;

    return c.json(
      {
        type: 'https://hoangsuphi.vn/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        code: 'SYS_001',
        detail: responseDetail,
        instance,
        traceId,
        retryable: false,
      },
      500,
      { 'Content-Type': 'application/problem+json' }
    );
  };
};

function formatInvalidParams(
  details: unknown
): Array<{ name: string; reason: string }> | undefined {
  if (!details) return undefined;
  if (Array.isArray(details)) {
    return details.map((item) => {
      if (typeof item === 'object' && item !== null && 'name' in item && 'reason' in item) {
        return { name: String(item.name), reason: String(item.reason) };
      }
      return { name: 'unknown', reason: String(item) };
    });
  }
  if (typeof details === 'object') {
    return Object.entries(details).map(([name, reason]) => ({
      name,
      reason: String(reason),
    }));
  }
  return [{ name: 'unknown', reason: String(details) }];
}
