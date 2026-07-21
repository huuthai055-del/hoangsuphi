import { describe, it, expect } from 'bun:test';
import { serializeJsonLd, buildSchema } from './jsonld';
import { env } from '@/config/env';
import type { SeoPageProjection } from '../types/seo';

describe('JSON-LD Builder & Serializer', () => {
  it('should serialize JSON safely and escape HTML to prevent XSS', () => {
    const payload = {
      malicious: '<script>alert(1)</script>',
    };

    const result = serializeJsonLd(payload);
    expect(result).not.toContain('<script>');
    expect(result).toContain('\\u003cscript\\u003ealert(1)\\u003c/script\\u003e');
  });

  it('should build absolute URLs correctly for BlogPosting', () => {
    const projection: SeoPageProjection = {
      pageGroup: 'article',
      canonicalPath: '/cam-nang/foo-bar',
      robots: 'index,follow',
      title: 'Test Blog',
      description: 'Desc',
      image: {
        url: '/images/blog.jpg',
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildSchema(projection) as any;
    expect(schema).not.toBeNull();
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema.mainEntityOfPage['@id']).toBe(`${env.PUBLIC_SITE_URL}/cam-nang/foo-bar`);
    expect(schema.image).toBe(`${env.PUBLIC_SITE_URL}/images/blog.jpg`);
  });
});
