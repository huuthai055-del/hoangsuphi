/**
 * Escapes HTML characters in user input to prevent XSS in email HTML templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Removes control characters and line breaks (CR/LF) from header strings to prevent header injection.
 */
export function sanitizeHeaderValue(str: string): string {
  return str.replace(/[\r\n]/g, '').trim();
}

export interface EmailVerificationTemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders the Vietnamese Email Verification template in both HTML and Plain Text versions.
 *
 * @param verificationUrl The complete URL to verify the account including the token query parameter.
 * @param userEmail Optional user email address for greeting inside the template.
 */
export function renderEmailVerificationTemplate(
  verificationUrl: string,
  userEmail?: string
): EmailVerificationTemplateResult {
  const subject = sanitizeHeaderValue('Xác thực tài khoản Hoàng Su Phì Portal');
  const greetingHtml = userEmail
    ? `<p>Xin chào <strong>${escapeHtml(userEmail)}</strong>,</p>`
    : '<p>Xin chào,</p>';
  const greetingText = userEmail ? `Xin chào ${userEmail},` : 'Xin chào,';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Xác thực tài khoản</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 24px; border-radius: 8px; border: 1px solid #e9ecef;">
    <h2 style="color: #2b6cb0; margin-top: 0;">Cổng thông tin Du lịch Hoàng Su Phì</h2>
    ${greetingHtml}
    <p>Cảm ơn bạn đã đăng ký tài khoản tại Cổng thông tin Du lịch Hoàng Su Phì. Để hoàn tất việc đăng ký và kích hoạt tài khoản, vui lòng nhấn vào nút xác thực bên dưới:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xác thực tài khoản</a>
    </div>
    <p>Nếu đường dẫn trên không hoạt động, bạn có thể sao chép và dán địa chỉ sau vào trình duyệt của mình:</p>
    <p style="word-break: break-all; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 14px;">
      <a href="${verificationUrl}" style="color: #3182ce;">${verificationUrl}</a>
    </p>
    <p style="color: #718096; font-size: 14px; margin-top: 24px;">Liên kết xác thực này có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #a0aec0; font-size: 12px; margin-bottom: 0;">© Cổng thông tin Du lịch Hoàng Su Phì. Đây là email tự động, vui lòng không trả lời.</p>
  </div>
</body>
</html>`;

  const text = `${greetingText}

Cảm ơn bạn đã đăng ký tài khoản tại Cổng thông tin Du lịch Hoàng Su Phì. Để hoàn tất việc đăng ký và kích hoạt tài khoản, vui lòng truy cập vào đường dẫn bên dưới:

${verificationUrl}

Liên kết xác thực này có hiệu lực trong vòng 24 giờ. Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.

---
© Cổng thông tin Du lịch Hoàng Su Phì. Đây là email tự động, vui lòng không trả lời.`;

  return {
    subject,
    html,
    text,
  };
}
