import Link from "next/link";
import { fetchHarvestStatusModule } from "@/lib/home/homepage-loaders";

export async function HeroHarvestBadge() {
  const result = await fetchHarvestStatusModule();

  if (result.status !== "success" || !result.data.stageLabel) {
    return null;
  }

  return (
    <Link
      href="/tinh-trang-mua-vu"
      className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/95 px-4 py-1.5 text-body-small font-medium text-primary shadow-soft backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span>Mùa vụ: {result.data.stageLabel}</span>
    </Link>
  );
}
