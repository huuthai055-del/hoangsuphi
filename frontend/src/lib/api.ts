import { env } from '@/config/env';
import type { SeoPageProjection } from './types/seo';
import { notFound } from 'next/navigation';

export async function fetchSeoProjection(pageGroup: string, slug?: string): Promise<SeoPageProjection> {
  const urlPath = slug ? `/api/v1/seo/pages/${pageGroup}/${slug}` : `/api/v1/seo/pages/${pageGroup}`;
  const url = `${env.INTERNAL_BACKEND_URL}${urlPath}`;

  const response = await fetch(url, {
    // SEO projection endpoint is Cache-Control: no-store per backend contract.
    // Only /sitemap.xml has long-lived caching (handled at backend level).
    // Using no-store ensures published/deactivated/soft-deleted entities are
    // reflected immediately without stale frontend cache.
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch SEO projection for ${pageGroup}${slug ? `/${slug}` : ''}. Status: ${response.status}`);
  }

  const res = await response.json();
  return res.data;
}
