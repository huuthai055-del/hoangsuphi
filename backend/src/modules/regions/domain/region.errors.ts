export class RegionDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegionDomainError';
  }
}

export class InvalidRegionNameError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRegionNameError';
  }
}

export class InvalidRegionSlugError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRegionSlugError';
  }
}

export class InvalidRegionLevelError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRegionLevelError';
  }
}

export class RegionLocationMismatchError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'RegionLocationMismatchError';
  }
}

export class RegionAccountDeletedError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'RegionAccountDeletedError';
  }
}

export class InvalidRegionStatusTransitionError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRegionStatusTransitionError';
  }
}

export class InvalidGPSLocationError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGPSLocationError';
  }
}

export class InvalidLtreePathError extends RegionDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLtreePathError';
  }
}

