import { z } from 'zod';

export const RegisterRequestSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .min(1, 'Email must not be empty')
      .email('Invalid email format'),
    password: z
      .string({ required_error: 'Password is required' })
      .trim()
      .min(1, 'Password must not be empty'),
    displayName: z.string().trim().min(1, 'DisplayName must not be empty').optional(),
  })
  .strict();

export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .min(1, 'Email must not be empty')
      .email('Invalid email format'),
    password: z
      .string({ required_error: 'Password is required' })
      .trim()
      .min(1, 'Password must not be empty'),
  })
  .strict();

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const RefreshRequestSchema = z
  .object({
    refreshToken: z
      .string({ required_error: 'RefreshToken is required' })
      .trim()
      .min(1, 'RefreshToken must not be empty'),
  })
  .strict();

export type RefreshRequestDto = z.infer<typeof RefreshRequestSchema>;

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .trim()
      .min(1, 'Current password must not be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .trim()
      .min(1, 'New password must not be empty'),
  })
  .strict();

export type ChangePasswordRequestDto = z.infer<typeof ChangePasswordRequestSchema>;

export interface UserResponseDto {
  id: string;
  email: string;
  permissionsVersion: number;
}

export interface UserSessionModelDto {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceName: string | null;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  session: UserSessionModelDto;
  user: UserResponseDto;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}
