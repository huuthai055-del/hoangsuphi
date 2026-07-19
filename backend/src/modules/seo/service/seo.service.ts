import * as crypto from 'node:crypto';
import { env } from '@/config/env';
import type { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import type { ISeoRepository, SitemapItem } from '../repository/seo-repository.interface';

export interface SeoImageProjection {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface SeoBreadcrumbProjection {
  name: string;
  path: string;
}

export type SeoSchemaProjection =
  | {
      kind: 'blog-posting';
      headline: string;
      datePublished: string;
      dateModified: string;
      author: { kind: 'person' | 'organization'; name: string };
    }
  | {
      kind: 'administrative-area';
      name: string;
      description: string | null;
      geo: { latitude: number; longitude: number } | null;
    }
  | {
      kind: 'tourist-attraction';
      name: string;
      description: string | null;
      geo: { latitude: number; longitude: number } | null;
    }
  | {
      kind: 'local-business';
      idPath: string;
      name: string;
      businessTypeCode: string;
      address: { addressLocality: string; addressRegion: string | null; addressCountry: 'VN' };
      geo: { latitude: number; longitude: number } | null;
      priceRange: string | null;
      aggregateRating: {
        ratingValue: number;
        reviewCount: number;
        bestRating: 5;
        worstRating: 1;
      } | null;
    }
  | {
      kind: 'place';
      schemaType: 'TouristAttraction' | 'Place';
      name: string;
      description: string | null;
      geo: { latitude: number; longitude: number } | null;
    }
  | { kind: 'collection-page'; name: string; description: string | null }
  | {
      kind: 'item-list';
      name: string;
      items: { position: number; name: string; path: string; image: SeoImageProjection | null }[];
    }
  | { kind: 'faq-page'; items: { question: string; answer: string }[] };

export interface SeoPageProjection {
  pageGroup:
    | 'article'
    | 'region'
    | 'place'
    | 'business'
    | 'attraction'
    | 'tag'
    | 'top-list'
    | 'faq-hub';
  canonicalPath: string;
  robots: 'index,follow' | 'noindex,follow';
  title: string;
  description: string;
  image: SeoImageProjection;
  breadcrumbs: SeoBreadcrumbProjection[];
  lastModified: string | null;
  schema: SeoSchemaProjection;
}

interface CacheEntry {
  body: string;
  etag: string;
  expiresAt: number;
}

export class SeoService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly seoRepository: ISeoRepository,
    private readonly mediaStorageResolver: MediaStorageResolver,
    private readonly publicSiteUrl: string
  ) {
    if (!this.publicSiteUrl || typeof this.publicSiteUrl !== 'string') {
      throw new Error('PUBLIC_SITE_URL must be a valid non-empty string');
    }
  }

  public getPublicSiteUrl(): string {
    return this.publicSiteUrl;
  }

  // Canonical Builder
  public buildCanonicalUrl(path: string): string {
    if (!path) {
      throw new Error('Canonical path cannot be empty');
    }
    // 1. Strip query parameters and hash fragments
    const firstPart = path.split(/[?#]/)[0];
    if (!firstPart) {
      throw new Error('Canonical path cannot be empty');
    }
    let cleanPath = firstPart;

    // 2. Normalize to lowercase
    cleanPath = cleanPath.toLowerCase();

    // 3. Normalize slashes
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`;
    }

    // 4. Remove trailing slash if not root '/'
    if (cleanPath !== '/' && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    // 5. Validate characters: only allow lowercase ASCII alphanumeric, dashes, and slashes
    if (!/^[a-z0-9\/-]+$/.test(cleanPath)) {
      throw new Error(
        `Invalid canonical path: ${path}. Only lowercase alphanumeric, dashes, and slashes are allowed.`
      );
    }

    return `${this.publicSiteUrl}${cleanPath}`;
  }

  // Helper for generating quoted ETag
  public generateETag(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `"${hash}"`;
  }

  // Helper for escaping XML
  public escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/'/g, '&apos;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Resolve Media URL
  private async resolveMediaUrl(
    mediaData: {
      storageProvider: string;
      storageKey: string;
      variants: Array<{ variantName: string; storageKey: string }>;
    } | null,
    fallbackPath: string
  ): Promise<string> {
    if (!mediaData) {
      return `${this.publicSiteUrl}${fallbackPath}`;
    }

    // Try finding variant in order: large -> medium -> original
    const variantOrder = ['large', 'medium', 'original'];
    let chosenKey: string | null = null;

    for (const vName of variantOrder) {
      const match = mediaData.variants.find((v) => v.variantName === vName);
      if (match) {
        chosenKey = match.storageKey;
        break;
      }
    }

    const storageKey = chosenKey || mediaData.storageKey;
    const provider = mediaData.storageProvider as 'LOCAL' | 'CLOUDINARY';

    try {
      const storage = this.mediaStorageResolver.resolve(provider);
      const url = await storage.getUrl(storageKey);

      // Prepend publicSiteUrl if relative local URL
      if (url.startsWith('/')) {
        return `${this.publicSiteUrl}${url}`;
      }
      return url;
    } catch {
      return `${this.publicSiteUrl}${fallbackPath}`;
    }
  }

  // Caching mechanism
  public getCacheEntry(
    key: string,
    ifNoneMatch?: string
  ): { status: 304 | 200 | 'MISS'; body?: string; etag?: string } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { status: 'MISS' };
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return { status: 'MISS' };
    }

    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return { status: 304 };
    }

    return { status: 200, body: entry.body, etag: entry.etag };
  }

  public setCacheEntry(key: string, body: string, ttlSeconds: number): string {
    const etag = this.generateETag(body);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { body, etag, expiresAt });
    return etag;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // XML Sitemap Builder
  public async buildSitemapXml(): Promise<string> {
    const items: SitemapItem[] = [];

    // Homepage
    items.push({ path: '/', lastmod: null });

    // Article List
    items.push({ path: '/cam-nang', lastmod: null });

    // Query sitemaps (8 queries in total, set-based, no N+1)
    const [articles, regions, places, businesses, attractions, tags, topLists, faqEligible] =
      await Promise.all([
        this.seoRepository.getSitemapArticles(),
        this.seoRepository.getSitemapRegions(),
        this.seoRepository.getSitemapPlaces(),
        this.seoRepository.getSitemapBusinesses(),
        this.seoRepository.getSitemapAttractions(),
        this.seoRepository.getSitemapTags(),
        this.seoRepository.getSitemapTopLists(),
        this.seoRepository.checkFaqHubEligibility(),
      ]);

    items.push(...articles);
    items.push(...regions);
    items.push(...places);
    items.push(...businesses);
    items.push(...attractions);
    items.push(...tags);
    items.push(...topLists);

    if (faqEligible) {
      items.push({ path: '/hoi-dap', lastmod: null });
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const item of items) {
      const loc = this.buildCanonicalUrl(item.path);
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(loc)}</loc>\n`;
      if (item.lastmod) {
        xml += `    <lastmod>${item.lastmod.toISOString()}</lastmod>\n`;
      }
      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  // Robots.txt Builder
  public buildRobotsTxt(): string {
    const isProduction = env.NODE_ENV === 'production';
    const isProductionUrl = this.publicSiteUrl === 'https://hoangsuphi.vn';

    if (isProduction && isProductionUrl) {
      let txt = 'User-agent: *\n';
      txt += 'Allow: /\n';
      txt += 'Disallow: /api/\n';
      txt += 'Disallow: /admin/\n';
      txt += 'Disallow: /auth/\n';
      txt += 'Disallow: /private/\n\n';
      txt += `Sitemap: ${this.buildCanonicalUrl('/sitemap.xml')}\n`;
      return txt;
    }

    // Fail-closed staging/dev/test robots policy
    return 'User-agent: *\nDisallow: /\n';
  }

  // Page Projection DTO Generator
  public async getPageProjection(
    pageGroup: SeoPageProjection['pageGroup'],
    slug?: string
  ): Promise<SeoPageProjection | null> {
    if (pageGroup === 'faq-hub') {
      const faqItems = await this.seoRepository.getFaqHubItems();
      if (faqItems.length === 0) return null;

      const title = 'Hỏi đáp du lịch Hoàng Su Phì | Du lịch Hoàng Su Phì';
      const description =
        'Giải đáp toàn bộ các câu hỏi thường gặp về du lịch ruộng bậc thang, homestay, cung đường phượt tại Hoàng Su Phì, Hà Giang.';
      const fallbackImage: SeoImageProjection = {
        url: `${this.publicSiteUrl}/images/og-faq.jpg`,
        alt: title,
        width: 1200,
        height: 630,
        mimeType: 'image/jpeg',
      };

      return {
        pageGroup: 'faq-hub',
        canonicalPath: '/hoi-dap',
        robots: 'index,follow',
        title,
        description,
        image: fallbackImage,
        breadcrumbs: [
          { name: 'Trang chủ', path: '/' },
          { name: 'Hỏi đáp', path: '/hoi-dap' },
        ],
        lastModified: null,
        schema: {
          kind: 'faq-page',
          items: faqItems,
        },
      };
    }

    if (!slug) return null;

    switch (pageGroup) {
      case 'article': {
        const art = await this.seoRepository.findArticleBySlug(slug);
        if (!art) return null;

        const imageUrl = await this.resolveMediaUrl(art.media, '/images/og-article-default.jpg');
        const title = `${art.title} | Cổng thông tin du lịch Hoàng Su Phì`;
        const image: SeoImageProjection = {
          url: imageUrl,
          alt: art.title,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        const authorName = art.authorName || 'Cổng thông tin du lịch Hoàng Su Phì';
        const authorKind = art.authorName ? 'person' : 'organization';

        return {
          pageGroup: 'article',
          canonicalPath: `/cam-nang/${art.slug}`,
          robots: 'index,follow',
          title,
          description: art.excerpt || art.title,
          image,
          breadcrumbs: [
            { name: 'Trang chủ', path: '/' },
            { name: 'Cẩm nang', path: '/cam-nang' },
            { name: art.title, path: `/cam-nang/${art.slug}` },
          ],
          lastModified: art.updatedAt.toISOString(),
          schema: {
            kind: 'blog-posting',
            headline: art.title,
            datePublished: art.publishedAt.toISOString(),
            dateModified: art.updatedAt.toISOString(),
            author: {
              kind: authorKind,
              name: authorName,
            },
          },
        };
      }

      case 'region': {
        const reg = await this.seoRepository.findRegionBySlug(slug);
        if (!reg) return null;

        const title = `${reg.name} | Cổng thông tin du lịch Hoàng Su Phì`;
        const description =
          reg.description ||
          `Tìm hiểu thông tin du lịch, thời tiết, homestay và ruộng bậc thang tại khu vực ${reg.name}, Hoàng Su Phì.`;
        const image: SeoImageProjection = {
          url: `${this.publicSiteUrl}/images/og-region-default.jpg`,
          alt: reg.name,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        // Breadcrumbs based on path components
        const pathParts = reg.path.split('.');
        const parentSlugs = pathParts.slice(0, -1).map((p) => p.replace(/_/g, '-'));

        const parentRegions =
          parentSlugs.length > 0
            ? await this.seoRepository.resolveRegionPathBySlugs(parentSlugs)
            : [];

        const breadcrumbs: SeoBreadcrumbProjection[] = [{ name: 'Trang chủ', path: '/' }];
        for (const p of parentRegions) {
          breadcrumbs.push({ name: p.name, path: `/khu-vuc/${p.slug}` });
        }
        breadcrumbs.push({ name: reg.name, path: `/khu-vuc/${reg.slug}` });

        const robots = reg.level >= 4 ? 'noindex,follow' : 'index,follow';
        const geo =
          reg.latitude && reg.longitude
            ? { latitude: Number(reg.latitude), longitude: Number(reg.longitude) }
            : null;

        return {
          pageGroup: 'region',
          canonicalPath: `/khu-vuc/${reg.slug}`,
          robots,
          title,
          description,
          image,
          breadcrumbs,
          lastModified: reg.updatedAt.toISOString(),
          schema: {
            kind: 'administrative-area',
            name: reg.name,
            description,
            geo,
          },
        };
      }

      case 'place': {
        const plc = await this.seoRepository.findPlaceBySlug(slug);
        if (!plc) return null;

        const title = `${plc.name} | Cổng thông tin du lịch Hoàng Su Phì`;
        const description =
          plc.description ||
          `Khám phá điểm du lịch ${plc.name} tại Hoàng Su Phì, Hà Giang với hướng dẫn chi tiết và hình ảnh ruộng bậc thang tuyệt đẹp.`;
        const imageUrl = await this.resolveMediaUrl(plc.media, '/images/og-place-default.jpg');
        const image: SeoImageProjection = {
          url: imageUrl,
          alt: plc.name,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        const breadcrumbs: SeoBreadcrumbProjection[] = [{ name: 'Trang chủ', path: '/' }];
        if (plc.parentRegion) {
          breadcrumbs.push({
            name: plc.parentRegion.slug === 'hoang-su-phi' ? 'Hoàng Su Phì' : plc.parentRegion.slug,
            path: `/khu-vuc/${plc.parentRegion.slug}`,
          });
        }
        breadcrumbs.push({ name: plc.name, path: `/dia-diem/${plc.slug}` });

        const geo =
          plc.latitude && plc.longitude
            ? { latitude: plc.latitude, longitude: plc.longitude }
            : null;

        return {
          pageGroup: 'place',
          canonicalPath: `/dia-diem/${plc.slug}`,
          robots: 'index,follow',
          title,
          description,
          image,
          breadcrumbs,
          lastModified: plc.updatedAt.toISOString(),
          schema: {
            kind: 'tourist-attraction',
            name: plc.name,
            description,
            geo,
          },
        };
      }

      case 'business': {
        const bus = await this.seoRepository.findBusinessBySlug(slug);
        if (!bus) return null;

        const title = `${bus.name} | Cổng thông tin du lịch Hoàng Su Phì`;
        const description =
          bus.description ||
          `${bus.name} tại Hoàng Su Phì, Hà Giang. Đọc đánh giá khách quan, xem hình ảnh thực tế và thông tin liên hệ trực tiếp.`;
        const imageUrl = await this.resolveMediaUrl(bus.media, '/images/og-business-default.jpg');
        const image: SeoImageProjection = {
          url: imageUrl,
          alt: bus.name,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        const breadcrumbs: SeoBreadcrumbProjection[] = [{ name: 'Trang chủ', path: '/' }];
        if (bus.parentRegion) {
          breadcrumbs.push({
            name: bus.parentRegion.name,
            path: `/khu-vuc/${bus.parentRegion.slug}`,
          });
        }
        breadcrumbs.push({ name: bus.name, path: `/co-so/${bus.slug}` });

        // Map Business Type to Schema LocalBusiness subtype
        const businessTypeCode = this.mapBusinessTypeCode(bus.businessTypeCode);

        // Resolve Local Address localization details
        let addressLocality = 'Hoàng Su Phì';
        let addressRegion: string | null = 'Hà Giang';

        if (bus.parentRegion) {
          addressLocality = bus.parentRegion.name;
          const resolvedPath = await this.seoRepository.resolveRegionPathBySlugs(
            bus.parentRegion.path.split('.').map((p) => p.replace(/_/g, '-'))
          );
          const prov = resolvedPath.find((p) => p.level === 1);
          if (prov) addressRegion = prov.name;
        }

        const geo =
          bus.latitude && bus.longitude
            ? { latitude: bus.latitude, longitude: bus.longitude }
            : null;

        const aggregateRating =
          bus.reviewCount > 0 && bus.ratingValue
            ? {
                ratingValue: bus.ratingValue,
                reviewCount: bus.reviewCount,
                bestRating: 5 as const,
                worstRating: 1 as const,
              }
            : null;

        return {
          pageGroup: 'business',
          canonicalPath: `/co-so/${bus.slug}`,
          robots: 'index,follow',
          title,
          description,
          image,
          breadcrumbs,
          lastModified: bus.updatedAt.toISOString(),
          schema: {
            kind: 'local-business',
            idPath: `/co-so/${bus.slug}`,
            name: bus.name,
            businessTypeCode,
            address: {
              addressLocality,
              addressRegion,
              addressCountry: 'VN',
            },
            geo,
            priceRange: bus.priceMin && bus.priceMax ? `${bus.priceMin}-${bus.priceMax} VND` : null,
            aggregateRating,
          },
        };
      }

      case 'attraction': {
        const att = await this.seoRepository.findAttractionBySlug(slug);
        if (!att) return null;

        const title = `${att.name} | Cổng thông tin du lịch Hoàng Su Phì`;
        const description =
          att.description ||
          `Thông tin chi tiết về ${att.name} tại Hoàng Su Phì, Hà Giang phục vụ du khách phượt hành trình địa phương.`;
        const imageUrl = await this.resolveMediaUrl(att.media, '/images/og-attraction-default.jpg');
        const image: SeoImageProjection = {
          url: imageUrl,
          alt: att.name,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        const breadcrumbs: SeoBreadcrumbProjection[] = [{ name: 'Trang chủ', path: '/' }];
        if (att.parentRegion) {
          breadcrumbs.push({
            name: att.parentRegion.slug === 'hoang-su-phi' ? 'Hoàng Su Phì' : att.parentRegion.slug,
            path: `/khu-vuc/${att.parentRegion.slug}`,
          });
        }
        breadcrumbs.push({ name: att.name, path: `/tien-ich/${att.slug}` });

        const geo =
          att.latitude && att.longitude
            ? { latitude: att.latitude, longitude: att.longitude }
            : null;


        const schemaProj: SeoSchemaProjection = att.isUtility
          ? {
              kind: 'place',
              schemaType: 'Place',
              name: att.name,
              description,
              geo,
            }
          : {
              kind: 'tourist-attraction',
              name: att.name,
              description,
              geo,
            };

        return {
          pageGroup: 'attraction',
          canonicalPath: `/tien-ich/${att.slug}`,
          robots: 'index,follow',
          title,
          description,
          image,
          breadcrumbs,
          lastModified: att.updatedAt.toISOString(),
          schema: schemaProj,
        };
      }

      case 'tag': {
        const tag = await this.seoRepository.findTagBySlug(slug);
        if (!tag) return null;

        const title = `Bài viết về ${tag.name} | Cổng thông tin du lịch Hoàng Su Phì`;
        const description =
          tag.description ||
          `Tổng hợp tất cả các bài viết, cẩm nang và kinh nghiệm du lịch thực tế liên quan đến ${tag.name} tại Hoàng Su Phì.`;
        const image: SeoImageProjection = {
          url: `${this.publicSiteUrl}/images/og-tag.jpg`,
          alt: tag.name,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        return {
          pageGroup: 'tag',
          canonicalPath: `/tag/${tag.slug}`,
          robots: 'index,follow',
          title,
          description,
          image,
          breadcrumbs: [
            { name: 'Trang chủ', path: '/' },
            { name: tag.name, path: `/tag/${tag.slug}` },
          ],
          lastModified: null, // Tag does not use lastmod
          schema: {
            kind: 'collection-page',
            name: tag.name,
            description,
          },
        };
      }

      case 'top-list': {
        const tl = await this.seoRepository.findTopListBySlug(slug);
        if (!tl) return null;

        const title = `${tl.title} | Du lịch Hoàng Su Phì`;
        const description =
          tl.description ||
          `Danh sách xếp hạng ${tl.title} được đánh giá tốt nhất bởi khách du lịch và người dân bản địa tại Hoàng Su Phì.`;

        // Resolve cover image from first item media
        const firstItem = tl.items[0];
        const imageUrl = firstItem
          ? await this.resolveMediaUrl(firstItem.media, '/images/og-top-default.jpg')
          : `${this.publicSiteUrl}/images/og-top-default.jpg`;

        const image: SeoImageProjection = {
          url: imageUrl,
          alt: tl.title,
          width: 1200,
          height: 630,
          mimeType: 'image/jpeg',
        };

        const breadcrumbs: SeoBreadcrumbProjection[] = [
          { name: 'Trang chủ', path: '/' },
          { name: tl.title, path: `/top/${tl.slug}` },
        ];

        // Format items for schema
        const items = await Promise.all(
          tl.items.map(async (i) => {
            const itemImageUrl = await this.resolveMediaUrl(
              i.media,
              i.ownerType === 'BUSINESS'
                ? '/images/og-business-default.jpg'
                : i.ownerType === 'PLACE'
                  ? '/images/og-place-default.jpg'
                  : '/images/og-attraction-default.jpg'
            );
            const itemImage: SeoImageProjection = {
              url: itemImageUrl,
              alt: i.name,
              width: 1200,
              height: 630,
              mimeType: 'image/jpeg',
            };

            const pathPrefix =
              i.ownerType === 'BUSINESS'
                ? '/co-so'
                : i.ownerType === 'PLACE'
                  ? '/dia-diem'
                  : '/tien-ich';

            return {
              position: i.position,
              name: i.name,
              path: `${pathPrefix}/${i.slug}`,
              image: itemImage,
            };
          })
        );

        return {
          pageGroup: 'top-list',
          canonicalPath: `/top/${tl.slug}`,
          robots: 'index,follow',
          title,
          description,
          image,
          breadcrumbs,
          lastModified: tl.updatedAt.toISOString(),
          schema: {
            kind: 'item-list',
            name: tl.title,
            items,
          },
        };
      }

      default:
        return null;
    }
  }

  // Map businessTypeId code to local business schema subtypes
  private mapBusinessTypeCode(code: string): string {
    const clean = code.toLowerCase();
    if (clean.includes('homestay')) return 'BedAndBreakfast';
    if (clean.includes('bungalow') || clean.includes('guesthouse') || clean.includes('nhà nghỉ')) {
      return 'LodgingBusiness';
    }
    if (clean.includes('resort')) return 'Resort';
    if (clean.includes('restaurant') || clean.includes('nhà hàng') || clean.includes('quán ăn')) {
      return 'Restaurant';
    }
    if (clean.includes('cafe') || clean.includes('cà phê')) return 'CafeOrCoffeeShop';
    if (clean.includes('camping') || clean.includes('cắm trại')) return 'Campground';
    return 'LocalBusiness';
  }
}
