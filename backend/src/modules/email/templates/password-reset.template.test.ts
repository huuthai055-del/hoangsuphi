import { describe, expect, test } from 'bun:test';
import { renderPasswordResetTemplate } from './password-reset.template';

describe('renderPasswordResetTemplate', () => {
  test('escapes dynamic HTML and produces a safe plain-text representation', () => {
    const template = renderPasswordResetTemplate(
      'https://hoangsuphi.vn/reset-password?token=abc_123',
      'name<img src=x onerror=alert(1)>@example.com\r\nBCC:evil@example.com'
    );

    expect(template.html).not.toContain('<img src=x');
    expect(template.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(template.text).not.toContain('\r');
    expect(template.text).not.toContain('\nBCC:');
    expect(template.text).toContain('https://hoangsuphi.vn/reset-password?token=abc_123');
  });

  test('rejects a reset URL outside the validated HTTP(S) public-site boundary', () => {
    expect(() => renderPasswordResetTemplate('javascript:alert(1)', 'user@example.com')).toThrow(
      'Password reset URL must use HTTP or HTTPS'
    );
  });
});
