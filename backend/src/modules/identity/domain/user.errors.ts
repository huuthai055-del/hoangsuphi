export class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainError';
  }
}

export class InvalidUserEmailError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserEmailError';
  }
}

export class InvalidPasswordHashError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordHashError';
  }
}

export class UserAccountDeletedError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccountDeletedError';
  }
}

export class InvalidUserStatusTransitionError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserStatusTransitionError';
  }
}

export class InvalidFailedLoginAttemptsError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFailedLoginAttemptsError';
  }
}

export class InvalidPermissionsVersionError extends UserDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionsVersionError';
  }
}
