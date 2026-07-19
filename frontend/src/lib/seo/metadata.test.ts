import { describe, it, expect } from 'bun:test';
import { generateSeoMetadata } from './metadata';
import { env } from '@/config/env';
import type { SeoPageProjection } from '../types/seo';

describe('Metadata Builder', () => {
  it('should build absolute URLs for canonical and og:url', () => {
    const projection: SeoPageProjection = {
      pageGroup: 'article',
      canonicalPath: '/cam-nang/foo',
      robots: 'index,follow',
      title: 'Title',
      description: 'Desc',
      image: {
        url: '/images/test.jpg',
        alt: 'alt',
        width: 1200,
        height: 630,
        mimeType: 'image/jpeg'
      },
      breadcrumbs: [],
      lastModified: null,
      schema: {
        kind: 'blog-posting',
        headline: 'Test Blog',
        datePublished: '2023-01-01',
        dateModified: '2023-01-01',
        author: { kind: 'person', name: 'John Doe' }
      }
    };

    const metadata = generateSeoMetadata(projection);

    expect(metadata.alternates?.canonical).toBe(`${env.PUBLIC_SITE_URL}/cam-nang/foo`);
    expect(metadata.openGraph?.url).toBe(`${env.PUBLIC_SITE_URL}/cam-nang/foo`);
    // @ts-expect-error Testing object access
    expect(metadata.openGraph?.images[0].url).toBe(`${env.PUBLIC_SITE_URL}/images/test.jpg`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const og = metadata.openGraph as any;
    expect(og?.type).toBe('article');
    expect(og?.locale).toBe('vi_VN');
  });
});
