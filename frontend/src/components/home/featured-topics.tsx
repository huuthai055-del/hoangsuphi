import Link from "next/link";
import { fetchFeaturedTopicsModule } from "@/lib/home/homepage-loaders";

export async function FeaturedTopics() {
  const result = await fetchFeaturedTopicsModule();

  if (result.status === "error" || result.status === "empty") {
    // Hide section gracefully on error or empty without polluting layout
    return null;
  }

  const topics = result.data;
  if (topics.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-topics-heading"
      className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8"
    >
      <div className="flex flex-col gap-1">
        <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          Khám phá theo chủ đề
        </p>
        <h2
          id="featured-topics-heading"
          className="text-title font-bold text-foreground md:text-title-large"
        >
          Chủ đề nổi bật
        </h2>
      </div>

      <nav aria-label="Chủ đề nổi bật" className="mt-6">
        <div className="flex flex-wrap gap-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={topic.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-muted/40 px-5 py-2.5 text-body-small font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{topic.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
