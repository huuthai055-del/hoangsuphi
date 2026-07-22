import { Suspense } from "react";
import type { Metadata } from "next";
import { env } from "@/config/env";
import { serializeJsonLd } from "@/lib/seo/jsonld";

import { HeroSection } from "@/components/home/hero-section";
import { HarvestStatusSection } from "@/components/home/harvest-status-section";
import { SeasonalNavigation } from "@/components/home/seasonal-navigation";
import { ExploreSuggestions } from "@/components/home/explore-suggestions";
import { FeaturedTopics } from "@/components/home/featured-topics";
import { QuickNearbySlot } from "@/components/home/quick-nearby-slot";

import {
  HarvestStatusSkeleton,
  SeasonalNavigationSkeleton,
  ExploreSuggestionsSkeleton,
  FeaturedTopicsSkeleton,
} from "@/components/home/homepage-section-skeleton";

export const metadata: Metadata = {
  title: "Cổng thông tin du lịch Hoàng Su Phì",
  description:
    "Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.",
  alternates: {
    canonical: env.PUBLIC_SITE_URL,
  },
  robots: "index,follow",
  openGraph: {
    title: "Cổng thông tin du lịch Hoàng Su Phì",
    description:
      "Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.",
    url: env.PUBLIC_SITE_URL,
    images: [`${env.PUBLIC_SITE_URL}/images/home/hoang-su-phi-hero.webp`],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cổng thông tin du lịch Hoàng Su Phì",
    description:
      "Khám phá vẻ đẹp Hoàng Su Phì với ruộng bậc thang kỳ vĩ, văn hóa bản địa độc đáo và các dịch vụ du lịch chất lượng.",
    images: [`${env.PUBLIC_SITE_URL}/images/home/hoang-su-phi-hero.webp`],
  },
};

export default function Homepage() {
  return (
    <div className="layout-container py-8 space-y-10">
      {/* Raw script for WebSite and Organization as per 12.1 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: env.PUBLIC_SITE_URL,
              name: "Hoàng Su Phì",
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              url: env.PUBLIC_SITE_URL,
              name: "Hoàng Su Phì",
              logo: `${env.PUBLIC_SITE_URL}/images/home/hoang-su-phi-hero.webp`,
            },
          ]),
        }}
      />

      <HeroSection />

      <Suspense fallback={<HarvestStatusSkeleton />}>
        <HarvestStatusSection />
      </Suspense>

      <Suspense fallback={<SeasonalNavigationSkeleton />}>
        <SeasonalNavigation />
      </Suspense>

      <Suspense fallback={<ExploreSuggestionsSkeleton />}>
        <ExploreSuggestions />
      </Suspense>

      <Suspense fallback={<FeaturedTopicsSkeleton />}>
        <FeaturedTopics />
      </Suspense>

      <QuickNearbySlot />
    </div>
  );
}
