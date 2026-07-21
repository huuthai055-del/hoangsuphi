import { serializeJsonLd } from '@/lib/seo/jsonld';
import { Metadata } from 'next';
import { env } from '@/config/env';

export const metadata: Metadata = {
  title: 'Cẩm nang du lịch Hoàng Su Phì',
  description: 'Tổng hợp các bài viết, cẩm nang và kinh nghiệm du lịch Hoàng Su Phì chi tiết nhất.',
  alternates: {
    canonical: `${env.PUBLIC_SITE_URL}/cam-nang`,
  },
  robots: 'index,follow',
  openGraph: {
    title: 'Cẩm nang du lịch Hoàng Su Phì',
    description: 'Tổng hợp các bài viết, cẩm nang và kinh nghiệm du lịch Hoàng Su Phì chi tiết nhất.',
    url: `${env.PUBLIC_SITE_URL}/cam-nang`,
    images: [`${env.PUBLIC_SITE_URL}/images/og-blog.jpg`],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cẩm nang du lịch Hoàng Su Phì',
    description: 'Tổng hợp các bài viết, cẩm nang và kinh nghiệm du lịch Hoàng Su Phì chi tiết nhất.',
    images: [`${env.PUBLIC_SITE_URL}/images/og-blog.jpg`],
  },
};

export default function ArticleList() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* JSON-LD CollectionPage/Blog */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            url: `${env.PUBLIC_SITE_URL}/cam-nang`,
            name: 'Cẩm nang du lịch Hoàng Su Phì',
            description: 'Tổng hợp các bài viết, cẩm nang và kinh nghiệm du lịch Hoàng Su Phì chi tiết nhất.',
          }),
        }}
      />

      <h1 className="text-3xl font-bold mb-4">Cẩm nang du lịch Hoàng Su Phì</h1>
      <p className="text-gray-700">Tổng hợp các bài viết, cẩm nang và kinh nghiệm du lịch Hoàng Su Phì chi tiết nhất.</p>
    </main>
  );
}
