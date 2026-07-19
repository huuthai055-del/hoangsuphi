import type { Context } from 'hono';
import type { SeoService } from '../service/seo.service';

const ALLOWED_PAGE_GROUPS = new Set([
  'article',
  'region',
  'place',
  'business',
  'attraction',
  'tag',
  'top-list',
]);

export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  public getSitemap = async (c: Context): Promise<Response> => {
    const ifNoneMatch = c.req.header('If-None-Match');
    const cacheResult = this.seoService.getCacheEntry('sitemap', ifNoneMatch);

    if (cacheResult.status === 304) {
      return c.body(null, 304, {
        ETag: cacheResult.etag ?? '',
        'Cache-Control': 'public, max-age=3600',
      });
    }

    if (cacheResult.status === 200) {
      return c.body(cacheResult.body ?? '', 200, {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cacheResult.etag ?? '',
        'Cache-Control': 'public, max-age=3600',
      });
    }

    try {
      const xml = await this.seoService.buildSitemapXml();
      const etag = this.seoService.setCacheEntry('sitemap', xml, 3600);

      return c.body(xml, 200, {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: etag,
        'Cache-Control': 'public, max-age=3600',
      });
    } catch {
      return c.json(
        {
          type: 'https://hoangsuphi.vn/errors/service-unavailable',
          title: 'Service Unavailable',
          status: 503,
          code: 'SEO_002',
          detail: 'Database operation failed and no valid sitemap cache is available.',
          instance: c.req.path,
        },
        503,
        { 'Content-Type': 'application/problem+json' }
      );
    }
  };

  public getRobots = async (c: Context): Promise<Response> => {
    const ifNoneMatch = c.req.header('If-None-Match');
    const cacheResult = this.seoService.getCacheEntry('robots', ifNoneMatch);

    if (cacheResult.status === 304) {
      return c.body(null, 304, {
        ETag: cacheResult.etag ?? '',
        'Cache-Control': 'public, max-age=86400',
      });
    }

    if (cacheResult.status === 200) {
      return c.body(cacheResult.body ?? '', 200, {
        'Content-Type': 'text/plain; charset=utf-8',
        ETag: cacheResult.etag ?? '',
        'Cache-Control': 'public, max-age=86400',
      });
    }

    // Robots.txt is DB-independent, so it should not fail
    const txt = this.seoService.buildRobotsTxt();
    const etag = this.seoService.setCacheEntry('robots', txt, 86400);

    return c.body(txt, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'public, max-age=86400',
    });
  };

  public getPageProjection = async (c: Context): Promise<Response> => {
    const pageGroup = c.req.param('pageGroup') ?? '';
    const slug = c.req.param('slug') ?? '';

    if (!ALLOWED_PAGE_GROUPS.has(pageGroup)) {
      return this.renderGeneric404(c);
    }

    try {
      const projection = await this.seoService.getPageProjection(
        pageGroup as 'article' | 'region' | 'place' | 'business' | 'attraction' | 'tag' | 'top-list',
        slug
      );
      if (!projection) {
        return this.renderGeneric404(c);
      }

      return c.json({ data: projection }, 200, { 'Cache-Control': 'no-store' });
    } catch {
      return c.json(
        {
          type: 'https://hoangsuphi.vn/errors/service-unavailable',
          title: 'Service Unavailable',
          status: 503,
          code: 'SEO_002',
          detail: 'Database connection failed when generating page projection.',
          instance: c.req.path,
        },
        503,
        { 'Content-Type': 'application/problem+json' }
      );
    }
  };

  public getFaqHubProjection = async (c: Context): Promise<Response> => {
    try {
      const projection = await this.seoService.getPageProjection('faq-hub');
      if (!projection) {
        return this.renderGeneric404(c);
      }

      return c.json({ data: projection }, 200, { 'Cache-Control': 'no-store' });
    } catch {
      return c.json(
        {
          type: 'https://hoangsuphi.vn/errors/service-unavailable',
          title: 'Service Unavailable',
          status: 503,
          code: 'SEO_002',
          detail: 'Database connection failed when generating page projection.',
          instance: c.req.path,
        },
        503,
        { 'Content-Type': 'application/problem+json' }
      );
    }
  };

  private renderGeneric404(c: Context): Response {
    return c.json(
      {
        type: 'https://hoangsuphi.vn/errors/not-found',
        title: 'Resource Not Found',
        status: 404,
        code: 'SEO_001',
        detail: 'The requested page is not indexable or does not exist.',
        instance: c.req.path,
      },
      404,
      { 'Content-Type': 'application/problem+json' }
    );
  }
}
