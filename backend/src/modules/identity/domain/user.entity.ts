import {
  InvalidUserEmailError,
  InvalidPasswordHashError,
  UserAccountDeletedError,
  InvalidUserStatusTransitionError,
  InvalidFailedLoginAttemptsError,
  InvalidPermissionsVersionError,
} from './user.errors';

export type UserStatus =
  | 'active'
  | 'inactive'
  | 'locked'
  | 'suspended'
  | 'pending_verification'
  | 'deleted';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  permissionsVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  lastPasswordChangedAt: Date | null;
  lastFailedLoginAt: Date | null;
  deletedAt: Date | null;
}

export type CreateUserProps = Pick<UserProps, 'id' | 'email' | 'passwordHash'>;

export class User {
  public readonly id: string;
  public readonly createdAt: Date;
  private _email: string;
  private _passwordHash: string;
  private _status: UserStatus;
  private _failedLoginAttempts: number;
  private _lockoutUntil: Date | null;
  private _permissionsVersion: number;
  private _updatedAt: Date;
  private _lastLoginAt: Date | null;
  private _lastPasswordChangedAt: Date | null;
  private _lastFailedLoginAt: Date | null;
  private _deletedAt: Date | null;

  private constructor(props: UserProps) {
    if (!props.email) {
      throw new InvalidUserEmailError('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = props.email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      throw new InvalidUserEmailError('Invalid email format');
    }

    if (!props.passwordHash || props.passwordHash.trim().length < 10) {
      throw new InvalidPasswordHashError('Password hash must be a valid hash format (length >= 10)');
    }

    if (props.failedLoginAttempts < 0) {
      throw new InvalidFailedLoginAttemptsError('Failed login attempts cannot be negative');
    }
    if (props.permissionsVersion < 1) {
      throw new InvalidPermissionsVersionError('Permissions version must be at least 1');
    }

    this.id = props.id;
    this.createdAt = props.createdAt;
    this._email = normalizedEmail;
    this._passwordHash = props.passwordHash;
    this._status = props.status;
    this._failedLoginAttempts = props.failedLoginAttempts;
    this._lockoutUntil = props.lockoutUntil;
    this._permissionsVersion = props.permissionsVersion;
    this._updatedAt = props.updatedAt;
    this._lastLoginAt = props.lastLoginAt;
    this._lastPasswordChangedAt = props.lastPasswordChangedAt;
    this._lastFailedLoginAt = props.lastFailedLoginAt;
    this._deletedAt = props.deletedAt;
  }

  // Domain Factories
  public static create(props: CreateUserProps): User {
    const now = new Date();
    return new User({
      id: props.id,
      email: props.email,
      passwordHash: props.passwordHash,
      status: 'pending_verification',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      permissionsVersion: 1,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      lastPasswordChangedAt: null,
      lastFailedLoginAt: null,
      deletedAt: null,
    });
  }

  public static rehydrate(props: UserProps): User {
    return new User(props);
  }

  // Getters
  public get email(): string {
    return this._email;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get failedLoginAttempts(): number {
    return this._failedLoginAttempts;
  }

  public get lockoutUntil(): Date | null {
    return this._lockoutUntil;
  }

  public get permissionsVersion(): number {
    return this._permissionsVersion;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  public get lastPasswordChangedAt(): Date | null {
    return this._lastPasswordChangedAt;
  }

  public get lastFailedLoginAt(): Date | null {
    return this._lastFailedLoginAt;
  }

  public get deletedAt(): Date | null {
    return this._deletedAt;
  }

  // Business Methods
  public verifyEmail(): void {
    this.ensureNotDeleted();
    if (this._status !== 'pending_verification') {
      throw new InvalidUserStatusTransitionError('User email is already verified or not pending verification');
    }
    this._status = 'active';
    this.touch();
  }

  public lock(until: Date | null): void {
    this.ensureNotDeleted();
    this._status = 'locked';
    this._lockoutUntil = until;
    this._failedLoginAttempts = 0; // Clear attempts on lock to clean state
    this.touch();
  }

  public unlock(): void {
    this.ensureNotDeleted();
    if (this._status !== 'locked' && !this._lockoutUntil) {
      throw new InvalidUserStatusTransitionError('User account is not currently locked');
    }
    this._lockoutUntil = null;
    this._failedLoginAttempts = 0;
    if (this._status === 'locked') {
      this._status = 'active';
    }
    this.touch();
  }

  public recordLogin(now: Date = new Date()): void {
    this.ensureNotDeleted();
    if (this._status === 'suspended') {
      throw new InvalidUserStatusTransitionError('Suspended accounts cannot log in');
    }
    this._lastLoginAt = now;
    this._failedLoginAttempts = 0;
    this._lockoutUntil = null;
    if (this._status === 'locked' || this._status === 'inactive') {
      this._status = 'active';
    }
    this.touch();
  }

  public increaseFailedLoginAttempts(
    maxAttempts = 5,
    lockoutDurationMs = 15 * 60 * 1000
  ): void {
    this.ensureNotDeleted();
    this._failedLoginAttempts += 1;
    this._lastFailedLoginAt = new Date();
    if (this._failedLoginAttempts >= maxAttempts) {
      this.lock(new Date(Date.now() + lockoutDurationMs));
    } else {
      this.touch();
    }
  }

  public resetFailedLoginAttempts(): void {
    this.ensureNotDeleted();
    this._failedLoginAttempts = 0;
    this.touch();
  }

  public changePassword(newPasswordHash: string): void {
    this.ensureNotDeleted();
    if (!newPasswordHash || newPasswordHash.trim().length < 10) {
      throw new InvalidPasswordHashError('Password hash must be a valid hash format (length >= 10)');
    }
    this._passwordHash = newPasswordHash;
    this._lastPasswordChangedAt = new Date();
    this._permissionsVersion += 1; // Invalidate existing tokens on password change
    this.touch();
  }

  public activate(): void {
    this.ensureNotDeleted();
    if (this._status === 'active') {
      return; // Idempotency
    }
    if (this.isLocked()) {
      throw new InvalidUserStatusTransitionError('Cannot activate a locked user account directly, please unlock first');
    }
    this._status = 'active';
    this.touch();
  }

  public deactivate(): void {
    this.ensureNotDeleted();
    if (this._status === 'inactive') {
      return; // Idempotency
    }
    this._status = 'inactive';
    this.touch();
  }

  public softDelete(): void {
    if (this._status === 'deleted') {
      return;
    }
    this._status = 'deleted';
    this._deletedAt = new Date();
    this.touch();
  }

  public restore(): void {
    if (this._status !== 'deleted') {
      throw new InvalidUserStatusTransitionError('User account is not deleted');
    }
    this._status = 'inactive';
    this._deletedAt = null;
    this.touch();
  }

  // Helper Domain Invariants
  public isLocked(now: Date = new Date()): boolean {
    if (this._status === 'locked') {
      if (this._lockoutUntil && this._lockoutUntil <= now) {
        return false;
      }
      return true;
    }
    if (this._lockoutUntil && this._lockoutUntil > now) {
      return true;
    }
    return false;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private ensureNotDeleted(): void {
    if (this._status === 'deleted' || this._deletedAt) {
      throw new UserAccountDeletedError('Action cannot be performed on a deleted user account');
    }
  }

  // Serialization Helper
  public toSnapshot(): UserProps {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      status: this.status,
      failedLoginAttempts: this.failedLoginAttempts,
      lockoutUntil: this.lockoutUntil,
      permissionsVersion: this.permissionsVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      lastPasswordChangedAt: this.lastPasswordChangedAt,
      lastFailedLoginAt: this.lastFailedLoginAt,
      deletedAt: this.deletedAt,
    };
  }
}
