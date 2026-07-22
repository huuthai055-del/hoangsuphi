export function HarvestStatusSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[160px] w-full rounded-xl border border-border bg-muted/40 p-6 motion-safe:animate-pulse"
    >
      <div className="h-6 w-48 rounded bg-muted" />
      <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
    </div>
  );
}

export function SeasonalNavigationSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[180px] w-full rounded-xl border border-border bg-muted/40 p-6 motion-safe:animate-pulse"
    >
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function ExploreSuggestionsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[240px] w-full rounded-xl border border-border bg-muted/40 p-6 motion-safe:animate-pulse"
    >
      <div className="h-6 w-52 rounded bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-36 rounded-lg bg-muted" />
        <div className="h-36 rounded-lg bg-muted" />
        <div className="h-36 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function FeaturedTopicsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[140px] w-full rounded-xl border border-border bg-muted/40 p-6 motion-safe:animate-pulse"
    >
      <div className="h-6 w-44 rounded bg-muted" />
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-8 w-24 rounded-full bg-muted" />
        <div className="h-8 w-32 rounded-full bg-muted" />
        <div className="h-8 w-28 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-full bg-muted" />
      </div>
    </div>
  );
}
