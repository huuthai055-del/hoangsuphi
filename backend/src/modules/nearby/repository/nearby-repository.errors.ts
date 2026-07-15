export class NearbyRepositoryOperationError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Nearby repository ${operation} failed`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = 'NearbyRepositoryOperationError';
  }
}

export class NearbyRepositoryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NearbyRepositoryInvariantError';
  }
}
