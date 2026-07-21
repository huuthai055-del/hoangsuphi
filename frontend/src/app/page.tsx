import { serializeJsonLd } from '@/lib/seo/jsonld';
import { Metadata } from 'next';
import { env } from '@/config/env';

export const metadata: Metadata = {
  title: 'Cổng thông tin du lịch Hoàng Su Phì',
  description: 'Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.',
  alternates: {
    canonical: env.PUBLIC_SITE_URL, // /
  },
  robots: 'index,follow',
  openGraph: {
    title: 'Cổng thông tin du lịch Hoàng Su Phì',
    description: 'Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.',
    url: env.PUBLIC_SITE_URL,
    images: [`${env.PUBLIC_SITE_URL}/images/og-homepage.jpg`],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cổng thông tin du lịch Hoàng Su Phì',
    description: 'Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.',
    images: [`${env.PUBLIC_SITE_URL}/images/og-homepage.jpg`],
  },
};

export default function Homepage() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Raw script for WebSite and Organization as per 12.1 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: env.PUBLIC_SITE_URL,
              name: 'Hoàng Su Phì',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              url: env.PUBLIC_SITE_URL,
              name: 'Hoàng Su Phì',
              logo: `${env.PUBLIC_SITE_URL}/images/og-homepage.jpg`,
            }
          ]),
        }}
      />

      <h1 className="text-3xl font-bold mb-4">Cổng thông tin du lịch Hoàng Su Phì</h1>
      <p className="text-gray-700">Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.</p>
    </main>
  );
}
