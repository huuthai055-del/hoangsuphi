import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { RedirectResolverClient } from './lib/redirect-resolver.client';
import { expect, test, describe, beforeEach, afterEach, spyOn } from 'bun:test';

describe('Middleware Redirect Registry', () => {
  let resolveSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    resolveSpy = spyOn(RedirectResolverClient, 'resolve');
  });

  afterEach(() => {
    resolveSpy.mockRestore();
  });

  function createRequest(url: string, method = 'GET') {
    return new NextRequest(new URL(url, 'https://hoangsuphi.vn'), { method });
  }

  test('canonicalizes lowercase and trailing slash in one 308 hop without calling the resolver', async () => {
    const req = createRequest('https://hoangsuphi.vn/UPPER-CASE/');
    const res = await middleware(req);
    
    expect(res.status).toBe(308);
    expect(res.headers.get('Location')).toBe('https://hoangsuphi.vn/upper-case');
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  test('bypasses root and protected/system paths without resolver access', async () => {
    for (const path of [
      '/',
      '/api/v1/redirects/resolve',
      '/_next/static/chunk.js',
      '/sitemap.xml',
      '/robots.txt',
      '/favicon.ico',
      '/images/og-homepage.jpg',
    ]) {
      const res = await middleware(createRequest(`https://hoangsuphi.vn${path}`));
      expect(res.headers.get('x-middleware-next')).toBe('1');
    }
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  test('does not redirect non-idempotent requests', async () => {
    const res = await middleware(createRequest('https://hoangsuphi.vn/old-dest', 'POST'));

    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  test('Resolves redirect and returns 301, clearing queries', async () => {
    resolveSpy.mockResolvedValue({
      kind: 'match',
      targetPath: '/new-dest',
      statusCode: 301,
    });

    const req = createRequest('https://hoangsuphi.vn/old-dest?utm_source=abc#frag');
    const res = await middleware(req);

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://hoangsuphi.vn/new-dest');
    expect(resolveSpy).toHaveBeenCalledWith('/old-dest');
  });

  test('Fails open if resolver returns no-match', async () => {
    resolveSpy.mockResolvedValue({
      kind: 'no-match',
    });

    const req = createRequest('https://hoangsuphi.vn/normal-page');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  test('Fails open if resolver returns unavailable', async () => {
    resolveSpy.mockResolvedValue({
      kind: 'unavailable',
    });

    const req = createRequest('https://hoangsuphi.vn/normal-page');
    const res = await middleware(req);

    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  test('fails open if the resolver throws unexpectedly', async () => {
    resolveSpy.mockRejectedValue(new Error('resolver unavailable'));

    const res = await middleware(createRequest('https://hoangsuphi.vn/normal-page'));

    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
