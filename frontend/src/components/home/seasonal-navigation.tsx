import Link from "next/link";
import { fetchSeasonalNavigationModule } from "@/lib/home/homepage-loaders";

export async function SeasonalNavigation() {
  const result = await fetchSeasonalNavigationModule();

  if (result.status === "error" || result.status === "empty") {
    // Hide section gracefully on error or empty without polluting layout
    return null;
  }

  const items = result.data;
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="seasonal-nav-heading"
      className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            Điều hướng khu vực
          </p>
          <h2
            id="seasonal-nav-heading"
            className="mt-1 text-title font-bold text-foreground md:text-title-large"
          >
            Khám phá theo khu vực
          </h2>
        </div>
        <Link
          href="/khu-vuc"
          className="text-body-small font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Xem tất cả &rarr;
        </Link>
      </div>

      <nav aria-label="Khám phá theo khu vực" className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/khu-vuc/${item.slug}`}
              className="group flex min-h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-body-small font-medium text-foreground transition-all hover:border-primary/50 hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{item.name}</span>
              <span aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                &rsaquo;
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
