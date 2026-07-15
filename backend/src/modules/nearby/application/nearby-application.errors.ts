import type { ErrorDetails } from '@/common/errors/app.error';
import { ValidationError } from '@/common/errors/http.errors';

export class NearbyValidationError extends ValidationError {
  constructor(message = 'Nearby validation failed', details?: ErrorDetails) {
    super(message, details);
    this.name = 'NearbyValidationError';
  }
}

export class InvalidNearbyCursorError extends ValidationError {
  constructor(message = 'Invalid nearby cursor', details?: ErrorDetails) {
    super(message, details);
    this.name = 'InvalidNearbyCursorError';
  }
}

export class UnsupportedNearbyCursorVersionError extends ValidationError {
  constructor(message = 'Unsupported nearby cursor version', details?: ErrorDetails) {
    super(message, details);
    this.name = 'UnsupportedNearbyCursorVersionError';
  }
}

export class NearbyCursorQueryMismatchError extends ValidationError {
  constructor(message = 'Nearby cursor query mismatch', details?: ErrorDetails) {
    super(message, details);
    this.name = 'NearbyCursorQueryMismatchError';
  }
}

export class NearbyCursorConfigurationError extends Error {
  constructor(message = 'Nearby cursor configuration error') {
    super(message);
    this.name = 'NearbyCursorConfigurationError';
  }
}
