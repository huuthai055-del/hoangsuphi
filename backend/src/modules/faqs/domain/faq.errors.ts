export class FaqDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaqDomainError';
  }
}

export class InvalidFaqStateError extends FaqDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFaqStateError';
  }
}

export class ImmutableFaqError extends FaqDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableFaqError';
  }
}

export class TopListDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopListDomainError';
  }
}

export class DuplicateTopListItemError extends TopListDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateTopListItemError';
  }
}

export class InvalidTopListStateError extends TopListDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTopListStateError';
  }
}

export class EmptyTopListError extends TopListDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyTopListError';
  }
}

export class ImmutableTopListError extends TopListDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableTopListError';
  }
}
