import Link from "next/link";
import { fetchExploreSuggestionsModule } from "@/lib/home/homepage-loaders";
import type { ExploreSuggestionItem } from "@/lib/home/homepage-contracts";

function SuggestionCard({ item }: { readonly item: ExploreSuggestionItem }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
      {/* Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {item.image?.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image.url}
            alt={item.image.altText || item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60 p-4 text-center text-caption text-muted-foreground">
            {item.name}
          </div>
        )}

        {item.regionName && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-caption font-semibold text-foreground backdrop-blur-sm shadow-soft">
            {item.regionName}
          </span>
        )}
      </div>

      {/* Content Container */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-title-small font-bold text-foreground transition-colors group-hover:text-primary">
          <Link
            href={item.canonicalPath}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {item.name}
          </Link>
        </h3>

        {item.summary && (
          <p className="mt-2 line-clamp-2 text-body-small text-muted-foreground leading-relaxed">
            {item.summary}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between text-caption font-semibold text-primary">
          <span>Khám phá điểm đến</span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}

export async function ExploreSuggestions() {
  const result = await fetchExploreSuggestionsModule();

  if (result.status === "error" || result.status === "empty") {
    return (
      <section
        aria-labelledby="explore-suggestions-heading"
        className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8"
      >
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            Khám phá thêm
          </p>
          <h2
            id="explore-suggestions-heading"
            className="text-title font-bold text-foreground md:text-title-large"
          >
            Gợi ý khám phá
          </h2>
        </div>
        <p className="mt-4 text-body text-muted-foreground">
          Các điểm đến đang được cập nhật.
        </p>
      </section>
    );
  }

  const places = result.data.slice(0, 6);

  return (
    <section
      aria-labelledby="explore-suggestions-heading"
      className="space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-primary">
            Khám phá thêm
          </p>
          <h2
            id="explore-suggestions-heading"
            className="mt-1 text-title font-bold text-foreground md:text-title-large"
          >
            Gợi ý khám phá
          </h2>
        </div>
        <Link
          href="/dia-diem"
          className="text-body-small font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Xem tất cả địa điểm &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <SuggestionCard key={place.id} item={place} />
        ))}
      </div>
    </section>
  );
}
