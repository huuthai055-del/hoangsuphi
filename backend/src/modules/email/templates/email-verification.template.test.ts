import { describe, expect, it } from 'bun:test';
import {
  escapeHtml,
  renderEmailVerificationTemplate,
  sanitizeHeaderValue,
} from './email-verification.template';

describe('Email Verification Template', () => {
  it('should escape HTML properly', () => {
    expect(escapeHtml('<script>alert("XSS & test")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS &amp; test&quot;)&lt;/script&gt;'
    );
  });

  it('should sanitize header value by removing CR/LF characters', () => {
    expect(sanitizeHeaderValue('Subject\r\nInjected: Header')).toBe('SubjectInjected: Header');
  });

  it('should render exact Vietnamese subject and include verification URL in HTML and Text versions', () => {
    const url = 'https://hoangsuphi.vn/verify-email?token=token123_abc';
    const result = renderEmailVerificationTemplate(url, 'user<test>@hoangsuphi.vn');

    expect(result.subject).toBe('Xác thực tài khoản Hoàng Su Phì Portal');

    // HTML version must contain escaped email and raw/escaped URL
    expect(result.html).toInclude('user&lt;test&gt;@hoangsuphi.vn');
    expect(result.html).toInclude(url);
    expect(result.html).toInclude('Liên kết xác thực này có hiệu lực trong vòng <strong>24 giờ</strong>.');

    // Plain text version must not contain HTML tags and must include exact URL
    expect(result.text).not.toInclude('<strong>');
    expect(result.text).toInclude('user<test>@hoangsuphi.vn');
    expect(result.text).toInclude(url);
    expect(result.text).toInclude('Liên kết xác thực này có hiệu lực trong vòng 24 giờ.');
  });
});
