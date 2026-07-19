import { AppError, type ErrorDetails } from './app.error';

// ─── 400 Bad Request / Validation Error ──────────────────────────────────────
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'VAL_001';

  constructor(message = 'Validation failed', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/validation-failed' });
  }
}

// ─── 401 Unauthorized ────────────────────────────────────────────────────────
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTH_001';

  constructor(message = 'Authentication required', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/unauthenticated' });
  }
}

// ─── 403 Forbidden ──────────────────────────────────────────────────────────
export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'AUTH_002';

  constructor(message = 'Access denied', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/forbidden' });
  }
}

// ─── 404 Not Found ───────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'SYS_002';

  constructor(message = 'Resource not found', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/not-found' });
  }
}

// ─── 409 Conflict ────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'SYS_003';

  constructor(message = 'Conflict detected', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/conflict' });
  }
}

// ─── 429 Too Many Requests ───────────────────────────────────────────────────
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = 'SYS_004';
  override readonly retryable = true;

  constructor(message = 'Rate limit exceeded', details?: ErrorDetails) {
    super(message, details, {
      retryable: true,
      typeUri: 'https://hoangsuphi.vn/errors/too-many-requests',
    });
  }
}

// ─── 500 Internal Server Errors ──────────────────────────────────────────────
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'DB_001';

  constructor(message = 'Database operation failed', details?: ErrorDetails, cause?: Error) {
    super(message, details, { cause, typeUri: 'https://hoangsuphi.vn/errors/database-error' });
  }
}

export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly errorCode = 'SYS_005';
  override readonly retryable = true;

  constructor(message = 'External service failed', details?: ErrorDetails, cause?: Error) {
    super(message, details, {
      cause,
      retryable: true,
      typeUri: 'https://hoangsuphi.vn/errors/bad-gateway',
    });
  }
}

// ─── Token Errors ────────────────────────────────────────────────────────────
export class TokenInvalidOrExpiredError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'TOKEN_INVALID_OR_EXPIRED';

  constructor(message = 'Token xác minh không hợp lệ hoặc đã hết hạn.', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/token-invalid-or-expired' });
  }
}

export { TokenInvalidOrExpiredError as VerificationTokenInvalidOrExpiredError };

export class EmailDeliveryUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly errorCode = 'EMAIL_DELIVERY_UNAVAILABLE';

  constructor(message = 'Không thể gửi email vào lúc này. Vui lòng thử lại sau.', details?: ErrorDetails) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/service-unavailable' });
  }
}
