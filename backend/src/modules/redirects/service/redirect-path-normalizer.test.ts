import { describe, expect, it } from 'bun:test';
import {
  normalizeRedirectPath,
  validateRedirectSourcePath,
} from './redirect-path-normalizer';
import { InvalidRedirectPathError, ReservedRedirectSourceError } from '../domain/redirect.errors';

describe('redirect path normalizer', () => {
  it('canonicalizes lowercase, Unicode NFC, and a trailing slash', () => {
    expect(normalizeRedirectPath('/CAM-NANG/DU-LI\u0323CH/')).toBe('/cam-nang/du-lịch');
  });

  it('drops query strings and fragments only in loose resolver mode', () => {
    expect(normalizeRedirectPath('/cam-nang?utm_source=test#top')).toBe('/cam-nang');
    expect(() => normalizeRedirectPath('/cam-nang?utm_source=test', 'strict')).toThrow(
      InvalidRedirectPathError
    );
  });

  it('rejects external, relative, and backslash paths', () => {
    for (const path of ['https://example.com', '//example.com', 'cam-nang', '/\\example.com']) {
      expect(() => normalizeRedirectPath(path, 'strict')).toThrow(InvalidRedirectPathError);
    }
  });

  it('rejects ambiguous percent encodings, dot segments, wildcards, and malformed encodings', () => {
    for (const path of [
      '/a/%2e%2e/admin',
      '/a/%2fb',
      '/a/%5cb',
      '/a/*',
      '/a/(.*)',
      '/a/%E0%A4%A',
      '/a//b',
      '/a/../b',
    ]) {
      expect(() => normalizeRedirectPath(path, 'strict')).toThrow(InvalidRedirectPathError);
    }
  });

  it('rejects encoded or literal control characters and whitespace', () => {
    for (const path of ['/a\r\nb', '/a\0b', '/a%00b', '/a%20b', '/a b', ' /a', '/a ']) {
      expect(() => normalizeRedirectPath(path, 'strict')).toThrow(InvalidRedirectPathError);
    }
  });

  it('protects system sources while allowing normal public sources', () => {
    for (const path of [
      '/',
      '/api',
      '/api/v1/auth/login',
      '/_next/static/main.js',
      '/sitemap.xml',
      '/robots.txt',
      '/favicon.ico',
      '/images/og-homepage.jpg',
    ]) {
      expect(() => validateRedirectSourcePath(path)).toThrow(ReservedRedirectSourceError);
    }
    expect(() => validateRedirectSourcePath('/cam-nang/hoang-su-phi')).not.toThrow();
  });
});
