import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RedirectResolverClient } from './lib/redirect-resolver.client';
import { normalizePublicPathname, shouldBypassRedirectMiddleware } from './lib/redirect-path';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  if (shouldBypassRedirectMiddleware(pathname)) {
    return NextResponse.next();
  }

  const canonicalPathname = normalizePublicPathname(pathname);
  if (!canonicalPathname) {
    return NextResponse.next();
  }

  if (canonicalPathname !== pathname) {
    const canonicalUrl = new URL(request.url);
    canonicalUrl.pathname = canonicalPathname;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  try {
    const resolution = await RedirectResolverClient.resolve(canonicalPathname);

    if (resolution.kind === 'match') {
      const targetUrl = new URL(request.url);
      targetUrl.pathname = resolution.targetPath;
      targetUrl.search = '';
      targetUrl.hash = '';

      return NextResponse.redirect(targetUrl, resolution.statusCode);
    }
  } catch {
    // Fail open: resolver availability must not block a normal public route.
  }

  return NextResponse.next();
}
