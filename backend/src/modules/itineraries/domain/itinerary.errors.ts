export class ItineraryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ItineraryDomainError';
  }
}

export class DuplicateItineraryItemError extends ItineraryDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateItineraryItemError';
  }
}

export class InvalidItineraryStateError extends ItineraryDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidItineraryStateError';
  }
}

export class EmptyItineraryError extends ItineraryDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyItineraryError';
  }
}

export class ImmutableItineraryError extends ItineraryDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableItineraryError';
  }
}
