import { describe, test, expect } from 'bun:test';
import { User } from './user.entity';

describe('User Domain Entity', () => {
  const validProps = {
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
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

    test('should throw error if email is empty', () => {
      expect(() => {
        User.rehydrate({ ...validProps, email: '' });
      }).toThrow('Email is required');
    });

    test('should throw error if failedLoginAttempts is negative', () => {
      expect(() => {
        User.rehydrate({ ...validProps, failedLoginAttempts: -1 });
      }).toThrow('Failed login attempts cannot be negative');
    });

    test('should throw error if permissionsVersion is less than 1', () => {
      expect(() => {
        User.rehydrate({ ...validProps, permissionsVersion: 0 });
      }).toThrow('Permissions version must be at least 1');
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
      expect(() => user.verifyEmail()).toThrow(
        'User email is already verified or not pending verification'
      );
    });

    test('should throw error when verifying email of a deleted user', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      expect(() => user.verifyEmail()).toThrow(
        'Action cannot be performed on a deleted user account'
      );
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
      expect(() => user.unlock()).toThrow('User account is not currently locked');
    });

    test('should throw error when locking a deleted account', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      expect(() => user.lock(null)).toThrow('Action cannot be performed on a deleted user account');
    });
  });

  describe('increaseFailedLoginAttempts() & resetFailedLoginAttempts()', () => {
    test('should increment failed attempts and update last failed login timestamp', () => {
      const user = User.rehydrate(validProps);
      expect(user.failedLoginAttempts).toBe(0);

      user.increaseFailedLoginAttempts();

      expect(user.failedLoginAttempts).toBe(1);
      expect(user.lastFailedLoginAt).toBeInstanceOf(Date);
    });

    test('should reset failed login attempts to 0', () => {
      const user = User.rehydrate({ ...validProps, failedLoginAttempts: 3 });
      user.resetFailedLoginAttempts();
      expect(user.failedLoginAttempts).toBe(0);
    });

    test('should throw error when increasing failed attempts on deleted account', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      expect(() => user.increaseFailedLoginAttempts()).toThrow(
        'Action cannot be performed on a deleted user account'
      );
    });
  });

  describe('changePassword()', () => {
    test('should change password hash, update last password changed timestamp, but should NOT increment permissionsVersion', () => {
      const user = User.rehydrate(validProps);
      const initialVer = user.permissionsVersion;

      user.changePassword('new_secure_hash');

      expect(user.passwordHash).toBe('new_secure_hash');
      expect(user.lastPasswordChangedAt).toBeInstanceOf(Date);
      expect(user.permissionsVersion).toBe(initialVer + 1);
    });

    test('should throw error when password hash is empty', () => {
      const user = User.rehydrate(validProps);
      expect(() => user.changePassword('')).toThrow('Password hash cannot be empty');
    });
  });

  describe('activate() & deactivate()', () => {
    test('should activate account from inactive status', () => {
      const user = User.rehydrate({ ...validProps, status: 'inactive' });
      user.activate();
      expect(user.status).toBe('active');
    });

    test('should remain active when activate() is called on an active account', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      user.activate();
      expect(user.status).toBe('active');
    });

    test('should throw error when activating a locked account directly', () => {
      const user = User.rehydrate({ ...validProps, status: 'locked' });
      expect(() => user.activate()).toThrow(
        'Cannot activate a locked user account directly, please unlock first'
      );
    });

    test('should deactivate an active account', () => {
      const user = User.rehydrate({ ...validProps, status: 'active' });
      user.deactivate();
      expect(user.status).toBe('inactive');
    });

    test('should remain inactive when deactivate() is called on an inactive account', () => {
      const user = User.rehydrate({ ...validProps, status: 'inactive' });
      user.deactivate();
      expect(user.status).toBe('inactive');
    });
  });

  describe('softDelete()', () => {
    test('should mark account as deleted and set deletedAt', () => {
      const user = User.rehydrate(validProps);
      user.softDelete();

      expect(user.status).toBe('deleted');
      expect(user.deletedAt).toBeInstanceOf(Date);
    });

    test('should do nothing when softDelete() is called on an already deleted account', () => {
      const user = User.rehydrate({ ...validProps, status: 'deleted', deletedAt: new Date() });
      const initialDeletedAt = user.deletedAt;

      user.softDelete();

      expect(user.status).toBe('deleted');
      expect(user.deletedAt).toEqual(initialDeletedAt);
    });
  });
});
