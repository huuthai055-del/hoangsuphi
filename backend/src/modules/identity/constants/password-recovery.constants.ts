export const PasswordRecoveryConstants = {
  TOKEN_TTL_SECONDS: 30 * 60,
  RATE_LIMIT_FORGOT_IP_MAX: 10,
  RATE_LIMIT_FORGOT_EMAIL_MAX: 3,
  RATE_LIMIT_RESET_IP_MAX: 10,
  RATE_LIMIT_WINDOW_SECONDS: 60 * 60,
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000,
  COOLDOWN_SECONDS: 60,
  IDEMPOTENCY_TTL_SECONDS: 24 * 60 * 60,
  IDEMPOTENCY_LOCK_SECONDS: 60,
  MAX_TOKEN_LENGTH: 256,
  TIMING_EQUALIZATION_GRACE_MS: 500,
} as const;

/**
 * The generic forgot-password response must not reveal whether an account exists.
 * Its minimum duration therefore includes the configured sender timeout.
 */
export function getForgotPasswordTimingBudgetMs(emailSendTimeoutMs: number): number {
  return emailSendTimeoutMs + PasswordRecoveryConstants.TIMING_EQUALIZATION_GRACE_MS;
}
