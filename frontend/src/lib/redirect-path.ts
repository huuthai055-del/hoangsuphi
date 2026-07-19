const ENCODED_AMBIGUOUS_CHARACTER = /%(?:00|2e|2f|3f|23|5c)/iu;
const REGEXP_OR_WILDCARD_CHARACTER = /[*+^$()[\]{}|]/u;

function isReservedSystemPath(pathname: string): boolean {
  const lowercasePath = pathname.toLowerCase();
  return (
    lowercasePath === '/api' ||
    lowercasePath.startsWith('/api/') ||
    lowercasePath === '/_next' ||
    lowercasePath.startsWith('/_next/') ||
    lowercasePath === '/sitemap.xml' ||
    lowercasePath === '/robots.txt' ||
    lowercasePath === '/favicon.ico' ||
    lowercasePath === '/images' ||
    lowercasePath.startsWith('/images/')
  );
}

/**
 * Paths that must never invoke the registry resolver. Root is deliberately
 * included so the registry cannot redirect the canonical homepage.
 */
export function shouldBypassRedirectMiddleware(pathname: string): boolean {
  return pathname === '/' || isReservedSystemPath(pathname);
}

/**
 * Mirrors the public portion of the backend canonical-path contract. It never
 * turns an invalid request into a redirect; callers fail open instead.
 */
export function normalizePublicPathname(pathname: string): string | null {
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    ENCODED_AMBIGUOUS_CHARACTER.test(pathname)
  ) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURI(pathname);
  } catch {
    return null;
  }

  if (
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /[\r\n\0\s]/u.test(decoded) ||
    REGEXP_OR_WILDCARD_CHARACTER.test(decoded) ||
    decoded.includes('//') ||
    decoded.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return null;
  }

  const normalized = decoded.normalize('NFC').toLowerCase();
  const canonical = normalized.length > 1 ? normalized.replace(/\/+$/u, '') : normalized;
  return canonical.length <= 500 ? canonical : null;
}

/**
 * A resolver response may target the homepage, but never an internal API or
 * framework/SEO endpoint. It must already be canonical to prevent runtime
 * loops or redirect chains when the backend is misconfigured.
 */
export function isCanonicalRedirectTarget(pathname: string): boolean {
  const canonical = normalizePublicPathname(pathname);
  return canonical === pathname && !isReservedSystemPath(pathname);
}
