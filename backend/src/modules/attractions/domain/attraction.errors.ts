export class AttractionDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttractionDomainError';
  }
}
