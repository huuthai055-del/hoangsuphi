import { describe, expect, mock, test } from 'bun:test';
import type { IMediaStorage } from '@/modules/media/domain/storage.interface';
import type { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import type { ISeoRepository } from '../repository/seo-repository.interface';
import { SeoService } from './seo.service';

describe('SeoService Unit Tests', () => {
  const mockFindArticleBySlug = mock(() => Promise.resolve(null));
  const mockFindRegionBySlug = mock(() => Promise.resolve(null));
  const mockFindPlaceBySlug = mock(() => Promise.resolve(null));
  const mockFindBusinessBySlug = mock(() => Promise.resolve(null));
  const mockFindAttractionBySlug = mock(() => Promise.resolve(null));
  const mockFindTagBySlug = mock(() => Promise.resolve(null));
  const mockFindTopListBySlug = mock(() => Promise.resolve(null));
  const mockGetFaqHubItems = mock(() => Promise.resolve([]));
  const mockGetSitemapArticles = mock(() => Promise.resolve([]));
  const mockGetSitemapRegions = mock(() => Promise.resolve([]));
  const mockGetSitemapPlaces = mock(() => Promise.resolve([]));
  const mockGetSitemapBusinesses = mock(() => Promise.resolve([]));
  const mockGetSitemapAttractions = mock(() => Promise.resolve([]));
  const mockGetSitemapTags = mock(() => Promise.resolve([]));
  const mockGetSitemapTopLists = mock(() => Promise.resolve([]));
  const mockCheckFaqHubEligibility = mock(() => Promise.resolve(false));
  const mockResolveRegionPathBySlugs = mock(() => Promise.resolve([]));

  const mockRepo: ISeoRepository = {
    findArticleBySlug: mockFindArticleBySlug,
    findRegionBySlug: mockFindRegionBySlug,
    findPlaceBySlug: mockFindPlaceBySlug,
    findBusinessBySlug: mockFindBusinessBySlug,
    findAttractionBySlug: mockFindAttractionBySlug,
    findTagBySlug: mockFindTagBySlug,
    findTopListBySlug: mockFindTopListBySlug,
    getFaqHubItems: mockGetFaqHubItems,
    getSitemapArticles: mockGetSitemapArticles,
    getSitemapRegions: mockGetSitemapRegions,
    getSitemapPlaces: mockGetSitemapPlaces,
    getSitemapBusinesses: mockGetSitemapBusinesses,
    getSitemapAttractions: mockGetSitemapAttractions,
    getSitemapTags: mockGetSitemapTags,
    getSitemapTopLists: mockGetSitemapTopLists,
    checkFaqHubEligibility: mockCheckFaqHubEligibility,
    resolveRegionPathBySlugs: mockResolveRegionPathBySlugs,
  };

  const mockGetUrl = mock((key: string) => Promise.resolve(`/uploads/${key}`));
  const mockStorage: IMediaStorage = {
    upload: mock(() => Promise.resolve()),
    download: mock(() => Promise.resolve(Buffer.from(''))),
    delete: mock(() => Promise.resolve()),
    exists: mock(() => Promise.resolve(true)),
    getUrl: mockGetUrl,
  };

  const mockMediaResolver = {
    resolve: mock(() => mockStorage),
  } as unknown as MediaStorageResolver;

  const publicSiteUrl = 'https://hoangsuphi.vn';
  const seoService = new SeoService(mockRepo, mockMediaResolver, publicSiteUrl);

  test('Canonical URL builder prepends site URL and handles slashes', () => {
    expect(seoService.buildCanonicalUrl('/')).toBe('https://hoangsuphi.vn/');
    expect(seoService.buildCanonicalUrl('/cam-nang')).toBe('https://hoangsuphi.vn/cam-nang');
    expect(seoService.buildCanonicalUrl('cam-nang/')).toBe('https://hoangsuphi.vn/cam-nang');
    expect(seoService.buildCanonicalUrl('/dia-diem/ban-phung/')).toBe(
      'https://hoangsuphi.vn/dia-diem/ban-phung'
    );
    // Casing normalization
    expect(seoService.buildCanonicalUrl('/Cam-Nang')).toBe('https://hoangsuphi.vn/cam-nang');
    // Query parameter and fragment stripping
    expect(seoService.buildCanonicalUrl('/cam-nang?utm_source=fb#top')).toBe(
      'https://hoangsuphi.vn/cam-nang'
    );
    // Reject Unicode
    expect(() => seoService.buildCanonicalUrl('/khu-vực/hoang-su-phi')).toThrow();
    // Reject invalid characters
    expect(() => seoService.buildCanonicalUrl('/invalid_slug')).toThrow();
  });

  test('XML escaping escapes special characters', () => {
    const rawStr = 'Homestay & Restaurant "Phùng" <Test> \'Safe\'';
    const escaped = seoService.escapeXml(rawStr);
    expect(escaped).toBe(
      'Homestay &amp; Restaurant &quot;Phùng&quot; &lt;Test&gt; &apos;Safe&apos;'
    );
  });

  test('generateETag creates quoted SHA-256 hash', () => {
    const content = 'Test ETag Content';
    const etag = seoService.generateETag(content);
    expect(etag).toMatch(/^"[a-f0-9]{64}"$/);
  });

  test('robots.txt generation fits environment settings', () => {
    // Under test environment, NODE_ENV is set to 'test', should return Disallow: /
    const robotsText = seoService.buildRobotsTxt();
    expect(robotsText).toBe('User-agent: *\nDisallow: /\n');
  });

  test('Caching entry sets, gets, and expires', async () => {
    seoService.clearCache();
    const mockXml = '<xml>test</xml>';

    // Initial state: MISS
    let cache = seoService.getCacheEntry('sitemap');
    expect(cache.status).toBe('MISS');

    // Set cache entry for 1 second
    const etag = seoService.setCacheEntry('sitemap', mockXml, 1);
    expect(etag).toMatch(/^"[a-f0-9]{64}"$/);

    // Get cache entry: 200 HIT
    cache = seoService.getCacheEntry('sitemap');
    expect(cache.status).toBe(200);
    expect(cache.body).toBe(mockXml);
    expect(cache.etag).toBe(etag);

    // Get cache entry with matching If-None-Match: 304 HIT
    cache = seoService.getCacheEntry('sitemap', etag);
    expect(cache.status).toBe(304);

    // Wait for 1.1s for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Get cache entry: MISS due to expiration
    cache = seoService.getCacheEntry('sitemap');
    expect(cache.status).toBe('MISS');
  });

  test('resolveMediaUrl prioritizes variants and handles relative urls', async () => {
    mockGetUrl.mockClear();

    const mediaMock = {
      storageProvider: 'LOCAL',
      storageKey: 'original.png',
      variants: [
        { variantName: 'medium', storageKey: 'medium.png' },
        { variantName: 'large', storageKey: 'large.png' },
      ],
    };

    // Prioritize 'large' variant
    const url = await (seoService as any).resolveMediaUrl(mediaMock, '/images/fallback.png');
    expect(url).toBe('https://hoangsuphi.vn/uploads/large.png');
    expect(mockGetUrl).toHaveBeenCalledWith('large.png');

    // Fallback URL if media is null
    const fallbackUrl = await (seoService as any).resolveMediaUrl(null, '/images/fallback.png');
    expect(fallbackUrl).toBe('https://hoangsuphi.vn/images/fallback.png');
  });
});
