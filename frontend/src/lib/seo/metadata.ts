import { Metadata } from 'next';
import { SeoPageProjection } from '../types/seo';
import { env } from '@/config/env';

export function generateSeoMetadata(projection: SeoPageProjection): Metadata {
  const absoluteUrl = `${env.PUBLIC_SITE_URL}${projection.canonicalPath === '/' ? '' : projection.canonicalPath}`;

  return {
    title: projection.title,
    description: projection.description,
    alternates: {
      canonical: absoluteUrl,
    },
    robots: projection.robots,
    openGraph: {
      title: projection.title,
      description: projection.description,
      url: absoluteUrl,
      images: [
        {
          url: projection.image.url.startsWith('http') ? projection.image.url : `${env.PUBLIC_SITE_URL}${projection.image.url}`,
          width: projection.image.width || 1200,
          height: projection.image.height || 630,
          alt: projection.image.alt,
        },
      ],
      type: projection.schema.kind === 'blog-posting' ? 'article' : 'website',
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: projection.title,
      description: projection.description,
      images: [projection.image.url.startsWith('http') ? projection.image.url : `${env.PUBLIC_SITE_URL}${projection.image.url}`],
    },
  };
}
