export class MediaRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class MediaNotFoundError extends MediaRepositoryError {
  constructor(id: string) {
    super(`Media not found with ID: ${id}`);
  }
}

export class MediaDeletedError extends MediaRepositoryError {
  constructor(id: string) {
    super(`Media with ID: ${id} has been soft-deleted`);
  }
}

export class ScopedDuplicateConflictError extends MediaRepositoryError {}

export class InvalidLifecycleTransitionError extends MediaRepositoryError {}

export class PersistenceConflictError extends MediaRepositoryError {}
