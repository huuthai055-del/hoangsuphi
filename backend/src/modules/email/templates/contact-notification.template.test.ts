import { describe, expect, it } from 'bun:test';
import { renderContactNotificationTemplate } from './contact-notification.template';

describe('renderContactNotificationTemplate', () => {
  const input = {
    name: 'Người gửi <script>alert(1)</script>',
    email: 'sender@example.com',
    phone: '0123456789',
    subject: 'Cần hỗ trợ <script>',
    message: 'Nội dung <script>alert(1)</script>\nDòng thứ hai',
  };

  it('escapes all dynamic HTML while preserving plain-text message content', () => {
    const template = renderContactNotificationTemplate(input);

    expect(template.subject).toBe('[Liên hệ website] Cần hỗ trợ <script>');
    expect(template.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(template.html).toContain('Nội dung &lt;script&gt;alert(1)&lt;/script&gt;<br />Dòng thứ hai');
    expect(template.text).toContain('Nội dung <script>alert(1)</script>\nDòng thứ hai');
  });

  it('rejects line breaks in every header-originating value', () => {
    expect(() => renderContactNotificationTemplate({ ...input, name: 'A\r\nB' })).toThrow();
    expect(() => renderContactNotificationTemplate({ ...input, email: 'a\r\nb@example.com' })).toThrow();
    expect(() => renderContactNotificationTemplate({ ...input, phone: '1\r\n2' })).toThrow();
    expect(() => renderContactNotificationTemplate({ ...input, subject: 'A\r\nB' })).toThrow();
  });
});
