import { describe, expect, test, spyOn } from 'bun:test';
import { env } from '@/config/env';
import { RedirectResolverClient } from './redirect-resolver.client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('RedirectResolverClient', () => {
  test('requests the internal resolver without cache and maps a no-match envelope', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ data: null }));
    try {
      await expect(RedirectResolverClient.resolve('/old-page')).resolves.toEqual({ kind: 'no-match' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] ?? [];
      expect(String(url)).toBe(`${env.INTERNAL_BACKEND_URL}/api/v1/redirects/resolve?path=%2Fold-page`);
      expect(options).toMatchObject({ method: 'GET', cache: 'no-store' });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('maps only a canonical 301/302 internal target to a redirect match', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: { targetPath: '/new-page', statusCode: 302 } })
    );
    try {
      await expect(RedirectResolverClient.resolve('/old-page')).resolves.toEqual({
        kind: 'match',
        targetPath: '/new-page',
        statusCode: 302,
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('fails closed for malformed, non-canonical, reserved, or self redirect responses', async () => {
    const invalidResponses = [
      { data: { targetPath: '/new-page/', statusCode: 301 } },
      { data: { targetPath: '/API/admin', statusCode: 301 } },
      { data: { targetPath: '/images/og-homepage.jpg', statusCode: 301 } },
      { data: { targetPath: '//external.example', statusCode: 301 } },
      { data: { targetPath: '/old-page', statusCode: 301 } },
      { data: { targetPath: '/new-page', statusCode: 308 } },
      { data: null, unexpected: true },
    ];

    for (const response of invalidResponses) {
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(response));
      try {
        await expect(RedirectResolverClient.resolve('/old-page')).resolves.toEqual({ kind: 'unavailable' });
      } finally {
        fetchSpy.mockRestore();
      }
    }
  });

  test('fails open on backend errors, network errors, or an unsafe source path', async () => {
    const unavailableStatusSpy = spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 503));
    try {
      await expect(RedirectResolverClient.resolve('/old-page')).resolves.toEqual({ kind: 'unavailable' });
    } finally {
      unavailableStatusSpy.mockRestore();
    }

    const networkFailureSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network failure'));
    try {
      await expect(RedirectResolverClient.resolve('/old-page')).resolves.toEqual({ kind: 'unavailable' });
    } finally {
      networkFailureSpy.mockRestore();
    }

    const invalidSourceSpy = spyOn(globalThis, 'fetch');
    try {
      await expect(RedirectResolverClient.resolve('/Old-Page')).resolves.toEqual({ kind: 'unavailable' });
      expect(invalidSourceSpy).not.toHaveBeenCalled();
    } finally {
      invalidSourceSpy.mockRestore();
    }
  });
});
