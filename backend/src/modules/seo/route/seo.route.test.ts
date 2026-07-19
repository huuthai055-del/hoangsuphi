import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import { SeoController } from './seo.controller';

describe('Seo API Routing & Controller', () => {
  let app: Hono;

  const mockGetPageProjection = mock(() => Promise.resolve(null as any));
  const mockBuildSitemapXml = mock(() => Promise.resolve('<xml></xml>'));
  const mockBuildRobotsTxt = mock(() => 'User-agent: *\nDisallow: /\n');
  const mockGetCacheEntry = mock((_key: string, _ifNoneMatch?: string): any => ({
    status: 'MISS',
  }));
  const mockSetCacheEntry = mock(() => 'mock-etag');

  const mockSeoService = {
    getPageProjection: mockGetPageProjection,
    buildSitemapXml: mockBuildSitemapXml,
    buildRobotsTxt: mockBuildRobotsTxt,
    getCacheEntry: mockGetCacheEntry,
    setCacheEntry: mockSetCacheEntry,
    getPublicSiteUrl: () => 'https://hoangsuphi.vn',
  };

  const mockController = new SeoController(mockSeoService as any);

  beforeEach(async () => {
    container.reset();
    container.register('SeoController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockGetPageProjection.mockClear();
    mockBuildSitemapXml.mockClear();
    mockBuildRobotsTxt.mockClear();
    mockGetCacheEntry.mockClear();
    mockSetCacheEntry.mockClear();
  });

  test('GET /sitemap.xml - Success 200', async () => {
    const sitemapContent = '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>';
    mockBuildSitemapXml.mockImplementation(() => Promise.resolve(sitemapContent));
    mockGetCacheEntry.mockImplementation(() => ({ status: 'MISS' as const }));

    const res = await app.request('/sitemap.xml');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(res.headers.get('ETag')).toBe('mock-etag');
    expect(await res.text()).toBe(sitemapContent);
  });

  test('GET /sitemap.xml - Conditional ETag 304', async () => {
    mockGetCacheEntry.mockImplementation(() => ({ status: 304, etag: 'mock-etag' }));

    const res = await app.request('/sitemap.xml', {
      headers: {
        'If-None-Match': 'mock-etag',
      },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get('ETag')).toBe('mock-etag');
    expect(await res.text()).toBe('');
  });

  test('GET /robots.txt - Success 200', async () => {
    mockGetCacheEntry.mockImplementation(() => ({ status: 'MISS' as const }));

    const res = await app.request('/robots.txt');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(res.headers.get('ETag')).toBe('mock-etag');
    expect(await res.text()).toBe('User-agent: *\nDisallow: /\n');
  });

  test('GET /api/v1/seo/pages/article/:slug - Success 200', async () => {
    const projectionData = {
      pageGroup: 'article',
      canonicalPath: '/cam-nang/kinh-nghiem-phuot',
      robots: 'index,follow',
      title: 'Kinh nghiệm phượt | Cổng thông tin du lịch Hoàng Su Phì',
      description: 'Excerpt of the article',
      image: {
        url: 'https://hoangsuphi.vn/uploads/large.png',
        alt: 'Kinh nghiệm phượt',
        width: 1200,
        height: 630,
        mimeType: 'image/jpeg',
      },
      breadcrumbs: [],
      lastModified: '2026-07-17T10:40:00.000Z',
      schema: {
        kind: 'blog-posting',
        headline: 'Kinh nghiệm phượt',
        datePublished: '2026-07-17T10:40:00.000Z',
        dateModified: '2026-07-17T10:40:00.000Z',
        author: { kind: 'person', name: 'Nguyễn Văn A' },
      },
    };

    mockGetPageProjection.mockImplementation(() => Promise.resolve(projectionData));

    const res = await app.request('/api/v1/seo/pages/article/kinh-nghiem-phuot');

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.data).toEqual(projectionData);
  });

  test('GET /api/v1/seo/pages/article/:slug - Generic 404', async () => {
    mockGetPageProjection.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/seo/pages/article/deleted-slug');

    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    const json = await res.json();
    expect(json.code).toBe('SEO_001');
    expect(json.title).toBe('Resource Not Found');
  });

  test('GET /api/v1/seo/pages/invalid-group/:slug - Generic 404', async () => {
    const res = await app.request('/api/v1/seo/pages/invalid-group/some-slug');

    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    const json = await res.json();
    expect(json.code).toBe('SEO_001');
  });

  test('GET /api/v1/seo/pages/article/:slug - Service Unavailable 503', async () => {
    mockGetPageProjection.mockImplementation(() =>
      Promise.reject(new Error('DB connection failed'))
    );

    const res = await app.request('/api/v1/seo/pages/article/some-slug');

    expect(res.status).toBe(503);
    expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    const json = await res.json();
    expect(json.code).toBe('SEO_002');
    expect(json.title).toBe('Service Unavailable');
  });
});
