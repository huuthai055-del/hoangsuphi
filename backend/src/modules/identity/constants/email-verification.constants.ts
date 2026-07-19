export const EmailVerificationConstants = {
  TOKEN_TTL_SECONDS: 24 * 3600, // 24 hours (86400s)
  IDEMPOTENCY_TTL_SECONDS: 24 * 3600, // 24 hours (86400s)
  IDEMPOTENCY_LOCK_SECONDS: 60, // 60 seconds processing lock
  RESEND_COOLDOWN_SECONDS: 60, // 60 seconds minimum interval between resends
  RATE_LIMIT_EMAIL_MAX: 3, // Max 3 resend requests per email per hour
  RATE_LIMIT_IP_MAX: 10, // Max 10 resend requests per IP per hour
  RATE_LIMIT_CONFIRM_IP_MAX: 10, // Max 10 confirm requests per IP per hour
  RATE_LIMIT_WINDOW_SECONDS: 3600, // 1 hour rate limit window in seconds
  RATE_LIMIT_WINDOW_MS: 3600 * 1000, // 1 hour rate limit window in milliseconds
  // The resend response must not complete before the email provider's bounded timeout.
  // The grace period covers local database/template work after the provider deadline.
  TIMING_EQUALIZATION_GRACE_MS: 500,
} as const;

export function getResendTimingBudgetMs(emailSendTimeoutMs: number): number {
  return emailSendTimeoutMs + EmailVerificationConstants.TIMING_EQUALIZATION_GRACE_MS;
}
