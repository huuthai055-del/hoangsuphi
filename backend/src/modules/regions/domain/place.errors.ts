export class PlaceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaceDomainError';
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
