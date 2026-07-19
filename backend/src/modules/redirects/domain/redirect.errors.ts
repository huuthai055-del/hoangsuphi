import { ConflictError, ValidationError, NotFoundError } from '../../../common/errors/http.errors';
import type { ErrorDetails } from '../../../common/errors/app.error';

export class RedirectNotFoundError extends NotFoundError {
  constructor(id: string, details?: ErrorDetails) {
    super(`Redirect with ID '${id}' not found`, details);
  }
}

export class InvalidRedirectPathError extends ValidationError {
  constructor(message = 'Invalid redirect path', details?: ErrorDetails) {
    super(message, details);
  }
}

export class ReservedRedirectSourceError extends ValidationError {
  constructor(message = 'Source path is reserved and cannot be redirected', details?: ErrorDetails) {
    super(message, details);
  }
}

export class RedirectSelfError extends ValidationError {
  constructor(message = 'Source and target paths cannot be identical after normalization', details?: ErrorDetails) {
    super(message, details);
  }
}

export class RedirectDuplicateError extends ConflictError {
  constructor(message = 'An active redirect with this source path already exists', details?: ErrorDetails) {
    super(message, details);
  }
}

export class RedirectChainError extends ConflictError {
  constructor(message = 'Redirect chain detected. An active target cannot be a source, and vice versa.', details?: ErrorDetails) {
    super(message, details);
  }
}

export class RedirectCycleError extends ConflictError {
  constructor(message = 'Redirect cycle detected', details?: ErrorDetails) {
    super(message, details);
  }
}
