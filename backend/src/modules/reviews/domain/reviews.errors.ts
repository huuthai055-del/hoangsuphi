export class ReviewDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewDomainError';
  }
}

export class InvalidRatingError extends ReviewDomainError {
  constructor(rating: number) {
    super(`Invalid review rating: ${rating}. Rating must be between 1 and 5.`);
    this.name = 'InvalidRatingError';
  }
}

export class InvalidReviewStateTransitionError extends ReviewDomainError {
  constructor(from: string, to: string) {
    super(`Invalid review state transition from ${from} to ${to}.`);
    this.name = 'InvalidReviewStateTransitionError';
  }
}

export class ImmutableReviewError extends ReviewDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableReviewError';
  }
}

export class FavoriteDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FavoriteDomainError';
  }
}
