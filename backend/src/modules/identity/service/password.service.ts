import { ValidationError } from '@/common/errors/http.errors';

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
  validatePolicy(password: string): void;
}

export class PasswordService implements IPasswordService {
  private readonly bcryptCost = 10;

  public async hash(password: string): Promise<string> {
    this.validatePolicy(password);
    return Bun.password.hash(password.trim(), {
      algorithm: 'bcrypt',
      cost: this.bcryptCost,
    });
  }

  public async verify(password: string, passwordHash: string): Promise<boolean> {
    if (!password || !passwordHash) {
      return false;
    }
    try {
      return await Bun.password.verify(password.trim(), passwordHash);
    } catch {
      return false;
    }
  }

  public validatePolicy(password: string): void {
    if (!password) {
      throw new ValidationError('Password is required');
    }

    const trimmed = password.trim();
    if (!trimmed) {
      throw new ValidationError('Password cannot contain only whitespace');
    }

    if (trimmed.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (trimmed.length > 128) {
      throw new ValidationError('Password must not exceed 128 characters');
    }
  }
}
