import { InvalidRedirectPathError, ReservedRedirectSourceError } from '../domain/redirect.errors';

export type RedirectPathMode = 'strict' | 'loose';

const RESERVED_SOURCE_PATHS = new Set([
  '/',
  '/api',
  '/_next',
  '/sitemap.xml',
  '/robots.txt',
  '/favicon.ico',
  '/images',
]);
const ENCODED_AMBIGUOUS_CHARACTER = /%(?:00|2e|2f|3f|23|5c)/iu;
const REGEXP_OR_WILDCARD_CHARACTER = /[*+^$()[\]{}|]/u;

/**
 * Produces the single canonical representation used by the redirect registry.
 * Strict mode is for admin writes; loose mode is only for resolving public
 * requests, where query strings and fragments are intentionally discarded.
 */
export function normalizeRedirectPath(rawPath: string, mode: RedirectPathMode = 'loose'): string {
  if (!rawPath || rawPath !== rawPath.trim()) {
    throw new InvalidRedirectPathError('Redirect path cannot be empty');
  }
  const raw = rawPath;
  if (/\s/u.test(raw) || /[\r\n\0\\]/u.test(raw)) {
    throw new InvalidRedirectPathError('Redirect path contains invalid characters');
  }
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    throw new InvalidRedirectPathError('Only internal absolute paths are allowed');
  }

  const suffixIndex = raw.search(/[?#]/u);
  if (mode === 'strict' && suffixIndex >= 0) {
    throw new InvalidRedirectPathError('Query strings and fragments are not allowed in redirect rules');
  }

  const pathname = suffixIndex >= 0 ? raw.slice(0, suffixIndex) : raw;
  if (!pathname || pathname.startsWith('//')) {
    throw new InvalidRedirectPathError('Only internal absolute paths are allowed');
  }
  if (ENCODED_AMBIGUOUS_CHARACTER.test(pathname)) {
    throw new InvalidRedirectPathError('Redirect path contains ambiguous encoded characters');
  }

  let decoded: string;
  try {
    decoded = decodeURI(pathname);
  } catch {
    throw new InvalidRedirectPathError('Redirect path contains malformed URL encoding');
  }

  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /[\r\n\0\s]/u.test(decoded) ||
    REGEXP_OR_WILDCARD_CHARACTER.test(decoded)
  ) {
    throw new InvalidRedirectPathError('Redirect path contains invalid characters');
  }
  if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new InvalidRedirectPathError('Dot segments are not allowed in redirect paths');
  }
  if (decoded.includes('//')) {
    throw new InvalidRedirectPathError('Redirect path cannot contain empty path segments');
  }

  const normalized = decoded.normalize('NFC').toLowerCase();
  const canonical = normalized.length > 1 && normalized.endsWith('/')
    ? normalized.slice(0, -1)
    : normalized;

  if (canonical.length > 500) {
    throw new InvalidRedirectPathError('Redirect path exceeds the maximum length');
  }
  return canonical;
}

export function validateRedirectSourcePath(path: string): void {
  if (
    RESERVED_SOURCE_PATHS.has(path) ||
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/images/')
  ) {
    throw new ReservedRedirectSourceError('Source path is reserved and cannot be redirected');
  }
}
