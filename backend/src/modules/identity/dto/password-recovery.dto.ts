import { z } from 'zod';
import { PasswordRecoveryConstants } from '../constants/password-recovery.constants';

export const ForgotPasswordRequestSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .min(1, 'Email must not be empty')
      .email('Invalid email format')
      .max(254, 'Email is too long'),
  })
  .strict();

export type ForgotPasswordRequestDto = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z
  .object({
    token: z
      .string({ required_error: 'Token is required' })
      .trim()
      .min(1, 'Token must not be empty')
      .max(PasswordRecoveryConstants.MAX_TOKEN_LENGTH, 'Token must not exceed 256 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Token format must be base64url'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .trim()
      .min(1, 'New password must not be empty'),
  })
  .strict();

export type ResetPasswordRequestDto = z.infer<typeof ResetPasswordRequestSchema>;
