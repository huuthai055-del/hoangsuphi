import { AppError } from '@/common/errors/app.error';

export class PlaceDomainError extends AppError {
  readonly statusCode: number = 400;
  readonly errorCode: string = 'PLC_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/place-domain-error' });
  }
}

export class InvalidPlaceNameError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaceNameError';
  }
}

export class InvalidPlaceSlugError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaceSlugError';
  }
}

export class InvalidPlaceRegionError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaceRegionError';
  }
}

export class InvalidPlaceCoverUrlError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaceCoverUrlError';
  }
}

export class PlaceDeletedError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'PlaceDeletedError';
  }
}

export class InvalidPlaceStatusTransitionError extends PlaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaceStatusTransitionError';
  }
}
