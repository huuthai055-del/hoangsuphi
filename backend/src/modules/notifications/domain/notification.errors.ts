export class NotificationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationDomainError';
  }
}

export class InvalidNotificationStateError extends NotificationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationStateError';
  }
}

export class ImmutableNotificationError extends NotificationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableNotificationError';
  }
}

export class InvalidNotificationTitleError extends NotificationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationTitleError';
  }
}

export class InvalidNotificationMessageError extends NotificationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationMessageError';
  }
}

export class InvalidNotificationUserError extends NotificationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationUserError';
  }
}
