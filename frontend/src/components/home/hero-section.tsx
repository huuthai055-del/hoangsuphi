import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { GlobalSearch } from "@/components/search/global-search";
import { HeroHarvestBadge } from "@/components/home/hero-harvest-badge";
import { QuickNearby } from "@/components/home/quick-nearby";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-14 text-center md:px-12 md:py-20">
      <Image
        src="/images/home/hoang-su-phi-hero.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 1152px"
        className="z-0 object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/55 to-black/65"
      />

      <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center">
        <div className="mb-4">
          <Suspense fallback={null}>
            <HeroHarvestBadge />
          </Suspense>
        </div>

        <h1 className="text-display-small font-bold tracking-tight text-primary-foreground md:text-display">
          Khám phá Hoàng Su Phì
        </h1>

        <p className="mt-4 max-w-2xl text-body text-primary-foreground/90 md:text-body-large">
          Ruộng bậc thang, bản làng và những trải nghiệm địa phương được cập nhật theo từng mùa.
        </p>

        <div className="mt-8 w-full max-w-xl">
          <GlobalSearch variant="hero" />
        </div>

        <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/dia-diem"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-body-small font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Khám phá địa điểm
          </Link>
          <QuickNearby variant="hero" />
        </div>
      </div>
    </section>
  );
}
