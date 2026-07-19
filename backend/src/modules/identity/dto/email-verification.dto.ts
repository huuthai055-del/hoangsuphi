import { z } from 'zod';

export const ResendVerificationRequestSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .min(1, 'Email must not be empty')
      .email('Invalid email format'),
  })
  .strict();

export type ResendVerificationRequestDto = z.infer<typeof ResendVerificationRequestSchema>;

export const ConfirmVerificationRequestSchema = z
  .object({
    token: z
      .string({ required_error: 'Token is required' })
      .trim()
      .min(1, 'Token must not be empty')
      .max(256, 'Token must not exceed 256 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Token format must be base64url'),
  })
  .strict();

export type ConfirmVerificationRequestDto = z.infer<typeof ConfirmVerificationRequestSchema>;
