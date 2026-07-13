import { AppError } from '@/common/errors/app.error';

export class RepositoryError extends AppError {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, details, { cause });
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/** PG 23505 — unique_violation */
export class DuplicateKeyRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 409, 'DB_REP_001', details, cause);
  }
}

/** 404 — record not found */
export class EntityNotFoundRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 404, 'DB_REP_002', details, cause);
  }
}

/** PG general / unclassified DB error */
export class DatabaseOperationRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 500, 'DB_REP_003', details, cause);
  }
}

/** PG 23503 — foreign_key_violation */
export class ConstraintViolationRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 409, 'DB_REP_004', details, cause);
  }
}

/** PG 23502 — not_null_violation */
export class NotNullViolationRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 422, 'DB_REP_005', details, cause);
  }
}

/** PG 23514 — check_violation */
export class CheckConstraintViolationRepositoryError extends RepositoryError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 422, 'DB_REP_006', details, cause);
  }
}

/** PG 40001 — serialization_failure / 40P01 — deadlock_detected */
export class TransactionConflictRepositoryError extends RepositoryError {
  readonly retryable = true;

  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 503, 'DB_REP_007', details, cause);
  }
}
