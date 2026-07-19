import { describe, expect, it } from 'bun:test';
import { redactRequestHeaders, redactSensitiveUrl } from './index';

describe('redactRequestHeaders', () => {
  it('redacts idempotency and authentication secrets without altering non-sensitive headers', () => {
    expect(
      redactRequestHeaders({
        'content-type': 'application/json',
        authorization: 'Bearer secret',
        cookie: 'session=secret',
        'idempotency-key': 'contact-idempotency-secret',
        'x-api-key': 'api-secret',
      })
    ).toEqual({
      'content-type': 'application/json',
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'idempotency-key': '[REDACTED]',
      'x-api-key': '[REDACTED]',
    });
  });
});

describe('redactSensitiveUrl', () => {
  it('redacts token-like query parameters case-insensitively', () => {
    const result = redactSensitiveUrl(
      'http://localhost/api/v1/auth/password/reset?TOKEN=raw-token&Idempotency-Key=request-secret&cursor=abc'
    );

    expect(result).not.toContain('raw-token');
    expect(result).not.toContain('request-secret');
    expect(result).not.toContain('cursor=abc');
    expect(result).toContain('%5BREDACTED%5D');
  });
});
