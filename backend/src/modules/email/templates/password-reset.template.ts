import { escapeHtml, sanitizeHeaderValue } from './email-verification.template';

export interface PasswordResetTemplateResult {
  subject: string;
  html: string;
  text: string;
}

function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('');
}

/**
 * Renders the Vietnamese Password Reset template in both HTML and Plain Text versions.
 *
 * @param resetUrl The complete URL to reset the password including the token query parameter.
 * @param userEmail Optional user email address for greeting inside the template.
 */
export function renderPasswordResetTemplate(
  resetUrl: string,
  userEmail?: string
): PasswordResetTemplateResult {
  const parsedResetUrl = new URL(resetUrl);
  if (parsedResetUrl.protocol !== 'https:' && parsedResetUrl.protocol !== 'http:') {
    throw new Error('Password reset URL must use HTTP or HTTPS');
  }

  const subject = sanitizeHeaderValue('Yêu cầu đặt lại mật khẩu - Hoàng Su Phì Portal');
  const greetingHtml = userEmail
    ? `<p>Xin chào <strong>${escapeHtml(userEmail)}</strong>,</p>`
    : '<p>Xin chào,</p>';
  const greetingText = userEmail
    ? `Xin chào ${stripControlCharacters(userEmail)},`
    : 'Xin chào,';
  const escapedResetUrl = escapeHtml(parsedResetUrl.toString());
  const plainTextResetUrl = stripControlCharacters(parsedResetUrl.toString());

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Đặt lại mật khẩu</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 24px; border-radius: 8px; border: 1px solid #e9ecef;">
    <h2 style="color: #2b6cb0; margin-top: 0;">Cổng thông tin Du lịch Hoàng Su Phì</h2>
    ${greetingHtml}
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapedResetUrl}" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
    </div>
    <p>Nếu đường dẫn trên không hoạt động, bạn có thể sao chép và dán địa chỉ sau vào trình duyệt của mình:</p>
    <p style="word-break: break-all; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 14px;">
      <a href="${escapedResetUrl}" style="color: #3182ce;">${escapedResetUrl}</a>
    </p>
    <p style="color: #718096; font-size: 14px; margin-top: 24px;">Liên kết đặt lại mật khẩu này có hiệu lực trong vòng <strong>30 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này, tài khoản của bạn vẫn an toàn.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #a0aec0; font-size: 12px; margin-bottom: 0;">© Cổng thông tin Du lịch Hoàng Su Phì. Đây là email tự động, vui lòng không trả lời.</p>
  </div>
</body>
</html>`;

  const text = `${greetingText}

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng truy cập vào đường dẫn bên dưới để đặt lại mật khẩu:

${plainTextResetUrl}

Liên kết đặt lại mật khẩu này có hiệu lực trong vòng 30 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này, tài khoản của bạn vẫn an toàn.

---
© Cổng thông tin Du lịch Hoàng Su Phì. Đây là email tự động, vui lòng không trả lời.`;

  return {
    subject,
    html,
    text,
  };
}
