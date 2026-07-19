import { describe, expect, test } from 'bun:test';
import { User } from './user.entity';
import {
  InvalidPasswordHashError,
  InvalidUserEmailError,
  InvalidUserStatusTransitionError,
  UserAccountDeletedError,
} from './user.errors';

describe('User Domain Entity', () => {
  const validProps = {
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    email: 'test@example.com',
    passwordHash: 'hashed_password_with_length_greater_than_20',
    status: 'pending_verification' as const,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    permissionsVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    lastPasswordChangedAt: null,
    lastFailedLoginAt: null,
    deletedAt: null,
  };

  describe('Creation & Rehydration Invariants', () => {
    test('should create a new user with default properties via create()', () => {
      const user = User.create({
        id: validProps.id,
        email: validProps.email,
        passwordHash: validProps.passwordHash,
      });

      expect(user.id).toBe(validProps.id);
      expect(user.email).toBe(validProps.email);
      expect(user.passwordHash).toBe(validProps.passwordHash);
      expect(user.status).toBe('pending_verification');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockoutUntil).toBeNull();
      expect(user.permissionsVersion).toBe(1);
    });

    test('should rehydrate a user via rehydrate()', () => {
      const user = User.rehydrate(validProps);
      expect(user.id).toBe(validProps.id);
      expect(user.email).toBe(validProps.email);
      expect(user.status).toBe(validProps.status);
    });

    test('should normalize email to lowercase and trim it', () => {
      const user = User.create({
        id: validProps.id,
        email: '  MyEmail@EXAMPLE.com  ',
        passwordHash: validProps.passwordHash,
      });
      expect(user.email).toBe('myemail@example.com');
    });

    test('should throw error if email format is invalid', () => {
      expect(() => {
        User.create({
          id: validProps.id,
          email: 'invalid-email',
          passwordHash: validProps.passwordHash,
        });
      }).toThrow(InvalidUserEmailError);
    });

    test('should throw error if passwordHash is shorter than 20 chars', () => {
      expect(() => {
        User.create({
          id: validProps.id,
          email: validProps.email,
          passwordHash: 'short',
        });
      }).toThrow(InvalidPasswordHashError);
    });

    test('should throw error if failedLoginAttempts is negative', () => {
      expect(() => {
        User.rehydrate({ ...validProps, failedLoginAttempts: -1 });
      }).toThrow(Error);
    });

    test('should throw error if permissionsVersion is less than 1', () => {
      expect(() => {
        User.rehydrate({ ...validProps, permissionsVersion: 0 });
      }).toThrow(Error);
    });
  });

  describe('verifyEmail()', () => {
    test('should successfully verify email when status is pending_verification', () => {
      const user = User.rehydrate(validProps);
      user.verifyEmail();
      expect(user.status).toBe('active');
    });

    test('should throw error when verifying email of an already verified user', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      expect(() => user.verifyEmail()).toThrow(InvalidUserStatusTransitionError);
    });

    test('should throw error when verifying email of a deleted user', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      expect(() => user.verifyEmail()).toThrow(UserAccountDeletedError);
    });
  });

  describe('lock() & unlock()', () => {
    test('should lock account until a specific time', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      const lockoutTime = new Date(Date.now() + 15 * 60 * 1000);
      user.lock(lockoutTime);

      expect(user.status).toBe('locked');
      expect(user.lockoutUntil).toEqual(lockoutTime);
      expect(user.isLocked()).toBe(true);
    });

    test('should unlock a locked account and reset failed login attempts', () => {
      const user = User.rehydrate({
        ...validProps,
        status: 'locked',
        lockoutUntil: new Date(Date.now() + 15 * 60 * 1000),
        failedLoginAttempts: 5,
      });

      user.unlock();

      expect(user.status).toBe('active');
      expect(user.lockoutUntil).toBeNull();
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.isLocked()).toBe(false);
    });

    test('should throw error when unlocking a non-locked account', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      expect(() => user.unlock()).toThrow(InvalidUserStatusTransitionError);
    });
  });

  describe('failed login locking logic', () => {
    test('should auto-lock user if attempts exceed maxAttempts', () => {
      const user = User.rehydrate({ ...validProps, status: 'active', failedLoginAttempts: 4 });
      user.increaseFailedLoginAttempts(5);

      expect(user.status).toBe('locked');
      expect(user.isLocked()).toBe(true);
      expect(user.lockoutUntil).not.toBeNull();
      expect(user.failedLoginAttempts).toBe(0); // Lock clears attempts
    });

    test('should only increment attempts when under maxAttempts', () => {
      const user = User.rehydrate({ ...validProps, status: 'active', failedLoginAttempts: 2 });
      user.increaseFailedLoginAttempts(5);

      expect(user.status).toBe('active');
      expect(user.failedLoginAttempts).toBe(3);
    });
  });

  describe('changePassword()', () => {
    test('should change password hash, update last password changed timestamp, and increment permissionsVersion', () => {
      const user = User.rehydrate(validProps);
      const initialVer = user.permissionsVersion;

      user.changePassword('new_secure_hash_with_length_greater_than_20');

      expect(user.passwordHash).toBe('new_secure_hash_with_length_greater_than_20');
      expect(user.lastPasswordChangedAt).toBeInstanceOf(Date);
      expect(user.permissionsVersion).toBe(initialVer + 1);
    });

    test('should throw error when password hash is empty', () => {
      const user = User.rehydrate(validProps);
      expect(() => user.changePassword('')).toThrow(InvalidPasswordHashError);
    });
  });

  describe('activate() & deactivate()', () => {
    test('should activate account from inactive status', () => {
      const user = User.rehydrate({ ...validProps, status: 'inactive' });
      user.activate();
      expect(user.status).toBe('active');
    });

    test('should throw error when activating a locked account directly', () => {
      const user = User.rehydrate({ ...validProps, status: 'locked' });
      expect(() => user.activate()).toThrow(InvalidUserStatusTransitionError);
    });

    test('should deactivate an active account', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      user.deactivate();
      expect(user.status).toBe('inactive');
    });
  });

  describe('softDelete() & restore()', () => {
    test('should mark account as deleted and set deletedAt', () => {
      const user = User.rehydrate(validProps);
      user.softDelete();

      expect(user.status).toBe('deleted');
      expect(user.deletedAt).toBeInstanceOf(Date);
    });

    test('should restore a deleted user as inactive', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      user.restore();

      expect(user.status).toBe('inactive');
      expect(user.deletedAt).toBeNull();
    });
  });
});
