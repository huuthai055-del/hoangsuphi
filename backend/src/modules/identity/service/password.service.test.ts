import { describe, test, expect } from 'bun:test';
import { PasswordService } from './password.service';
import { ValidationError } from '@/common/errors/http.errors';

describe('PasswordService', () => {
  const service = new PasswordService();
  const validPassword = 'superSecretPassword123';

  describe('validatePolicy()', () => {
    test('should pass with valid password', () => {
      expect(() => service.validatePolicy(validPassword)).not.toThrow();
    });

    test('should throw error when password is empty', () => {
      expect(() => service.validatePolicy('')).toThrow(ValidationError);
      expect(() => service.validatePolicy('')).toThrow('Password is required');
    });

    test('should throw error when password contains only whitespace', () => {
      expect(() => service.validatePolicy('    ')).toThrow(ValidationError);
      expect(() => service.validatePolicy('    ')).toThrow(
        'Password cannot contain only whitespace'
      );
    });

    test('should throw error when password is too short (less than 8 characters)', () => {
      expect(() => service.validatePolicy('short1')).toThrow(ValidationError);
      expect(() => service.validatePolicy('short1')).toThrow(
        'Password must be at least 8 characters long'
      );
    });

    test('should throw error when password is too long (more than 128 characters)', () => {
      const longPassword = 'a'.repeat(129);
      expect(() => service.validatePolicy(longPassword)).toThrow(ValidationError);
      expect(() => service.validatePolicy(longPassword)).toThrow(
        'Password must not exceed 128 characters'
      );
    });
  });

  describe('hash() & verify()', () => {
    test('should successfully hash a valid password', async () => {
      const hash = await service.hash(validPassword);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true); // bcrypt formats
    });

    test('should throw when hashing an invalid password', async () => {
      await expect(service.hash('short')).rejects.toThrow(ValidationError);
    });

    test('should return true for correct password matching hash', async () => {
      const hash = await service.hash(validPassword);
      const isMatch = await service.verify(validPassword, hash);
      expect(isMatch).toBe(true);
    });

    test('should return false for incorrect password matching hash', async () => {
      const hash = await service.hash(validPassword);
      const isMatch = await service.verify('wrongPassword123', hash);
      expect(isMatch).toBe(false);
    });

    test('should return false if password or hash is missing in verify()', async () => {
      const isMatch1 = await service.verify('', 'somehash');
      const isMatch2 = await service.verify('password', '');
      expect(isMatch1).toBe(false);
      expect(isMatch2).toBe(false);
    });

    test('should return false and not throw when hash format is completely invalid', async () => {
      const isMatch = await service.verify(validPassword, 'this-is-not-a-valid-hash');
      expect(isMatch).toBe(false);
    });

    test('should return false and not throw when verify is called with empty arguments', async () => {
      const isMatch = await service.verify('', '');
      expect(isMatch).toBe(false);
    });

    test('should generate different hashes for the same password due to random salt', async () => {
      const hash1 = await service.hash(validPassword);
      const hash2 = await service.hash(validPassword);
      expect(hash1).not.toEqual(hash2);
    });
  });
});
