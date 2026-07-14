export class BusinessDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessDomainError';
  }
}
