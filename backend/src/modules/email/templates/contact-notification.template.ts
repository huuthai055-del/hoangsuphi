import { escapeHtml, sanitizeHeaderValue } from './email-verification.template';

export interface ContactNotificationTemplateInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactNotificationTemplateResult {
  subject: string;
  html: string;
  text: string;
}

function assertHeaderSafe(value: string, field: string): void {
  if (/[\r\n]/u.test(value)) {
    throw new Error(`${field} must not contain newlines`);
  }
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
 * Renders a contact notification owned by the email-template boundary.
 * Header-originating values are rejected before rendering; user content is escaped only in HTML.
 */
export function renderContactNotificationTemplate(
  input: ContactNotificationTemplateInput
): ContactNotificationTemplateResult {
  assertHeaderSafe(input.name, 'Name');
  assertHeaderSafe(input.email, 'Email');
  assertHeaderSafe(input.phone ?? '', 'Phone');
  assertHeaderSafe(input.subject, 'Subject');

  const subject = sanitizeHeaderValue(`[Liên hệ website] ${input.subject}`);
  const safeName = stripControlCharacters(input.name);
  const safeEmail = stripControlCharacters(input.email);
  const safePhone = stripControlCharacters(input.phone ?? 'Không có');
  const safeSubject = stripControlCharacters(input.subject);
  const escapedMessage = escapeHtml(input.message).replace(/\r\n|\r|\n/gu, '<br />');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Thông báo liên hệ mới</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Có tin nhắn liên hệ mới từ Cổng thông tin Du lịch Hoàng Su Phì</h2>
  <p><strong>Họ tên:</strong> ${escapeHtml(input.name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
  <p><strong>Số điện thoại:</strong> ${escapeHtml(input.phone ?? 'Không có')}</p>
  <p><strong>Tiêu đề:</strong> ${escapeHtml(input.subject)}</p>
  <hr />
  <p><strong>Nội dung:</strong></p>
  <p>${escapedMessage}</p>
</body>
</html>`;

  const text = `Có tin nhắn liên hệ mới từ Cổng thông tin Du lịch Hoàng Su Phì

Họ tên: ${safeName}
Email: ${safeEmail}
Số điện thoại: ${safePhone}
Tiêu đề: ${safeSubject}

Nội dung:
${input.message}`;

  return { subject, html, text };
}
