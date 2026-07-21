import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:3000';

  try {
    const headers: Record<string, string> = {};
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }

    const res = await fetch(`${backendUrl}/sitemap.xml`, {
      cache: 'no-store',
      headers,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', res.headers.get('Content-Type') || 'application/xml');

    const etag = res.headers.get('ETag');
    if (etag) responseHeaders.set('ETag', etag);

    const cacheControl = res.headers.get('Cache-Control');
    if (cacheControl) responseHeaders.set('Cache-Control', cacheControl);

    if (res.status === 304) {
      return new Response(null, { status: 304, headers: responseHeaders });
    }

    if (!res.ok) {
      return new Response(res.body, { status: res.status, headers: responseHeaders });
    }

    return new Response(res.body, { status: 200, headers: responseHeaders });
  } catch (err) {
    console.error('Sitemap proxy error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
