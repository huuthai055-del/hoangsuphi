import type { ErrorHandler } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { isProd } from '@/config/env';
import { logger } from '@/lib/logger';
import { AppError } from '@/common/errors/app.error';

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

      c.res.headers.set('Content-Type', 'application/problem+json');
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
          ...(err.details ? { invalidParams: err.details } : {}),
        },
        err.statusCode as StatusCode
      );
    }

    if (err.name === 'ZodError') {
      logger.warn({ err: err.message, instance, traceId }, '⚠️ Unhandled Zod validation error');
      c.res.headers.set('Content-Type', 'application/problem+json');
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
        400
      );
    }

    logger.error(
      { err: err.message, stack: err.stack, instance, traceId },
      '🚨 Unhandled System Exception'
    );

    c.res.headers.set('Content-Type', 'application/problem+json');

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
      500
    );
  };
};
