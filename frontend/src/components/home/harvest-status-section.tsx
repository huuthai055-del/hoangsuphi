import Link from "next/link";
import { fetchHarvestStatusModule } from "@/lib/home/homepage-loaders";
import { cn } from "@/lib/cn";

const TONE_CLASSES: Record<
  "neutral" | "growing" | "ripening" | "golden" | "harvesting",
  string
> = {
  neutral: "bg-muted text-muted-foreground border-border",
  growing: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  ripening: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  golden: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40 font-semibold",
  harvesting: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
};

export async function HarvestStatusSection() {
  const result = await fetchHarvestStatusModule();

  if (result.status === "error" || result.status === "empty") {
    return (
      <section
        aria-labelledby="harvest-status-heading"
        className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8"
      >
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            Thông tin theo mùa
          </p>
          <h2
            id="harvest-status-heading"
            className="text-title font-bold text-foreground md:text-title-large"
          >
            Tình trạng mùa vụ
          </h2>
        </div>
        <p className="mt-4 text-body text-muted-foreground">
          Thông tin mùa vụ đang được cập nhật.
        </p>
      </section>
    );
  }

  const data = result.data;
  const toneClass = TONE_CLASSES[data.stageTone] ?? TONE_CLASSES.neutral;

  return (
    <section
      aria-labelledby="harvest-status-heading"
      className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-primary">
            Thông tin theo mùa
          </p>
          <h2
            id="harvest-status-heading"
            className="mt-1 text-title font-bold text-foreground md:text-title-large"
          >
            Tình trạng mùa vụ
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-body-small font-medium",
            toneClass
          )}
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {data.stageLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-body-large font-semibold text-foreground md:text-title">
          {data.title}
        </h3>
        <p className="text-body text-muted-foreground leading-relaxed">
          {data.summary}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-body-small text-muted-foreground">
          {data.regionSlug && (
            <Link
              href={`/khu-vuc/${data.regionSlug}`}
              className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Vùng: <span className="text-primary">{data.regionName}</span>
            </Link>
          )}

          {data.observedLabel && (
            <time dateTime={data.observedAt} className="text-caption">
              {data.observedLabel}
            </time>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <Link
          href="/tinh-trang-mua-vu"
          className="inline-flex items-center text-body-small font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Xem chi tiết mùa vụ &rarr;
        </Link>
      </div>
    </section>
  );
}
