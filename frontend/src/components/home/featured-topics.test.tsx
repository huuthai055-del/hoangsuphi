import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const topicsPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "featured-topics.tsx"
);
const topicsContent = readFileSync(topicsPath, "utf-8");

describe("FeaturedTopics Architecture & Contract", () => {
  test("FeaturedTopics is a Server Component without 'use client'", () => {
    expect(topicsContent).not.toContain('"use client"');
  });

  test("uses semantic section, nav element, and H2 heading 'Chủ đề nổi bật'", () => {
    expect(topicsContent).toContain('aria-labelledby="featured-topics-heading"');
    expect(topicsContent).toContain('id="featured-topics-heading"');
    expect(topicsContent).toContain("<h2");
    expect(topicsContent).toContain("Chủ đề nổi bật");
    expect(topicsContent).toContain('aria-label="Chủ đề nổi bật"');
  });

  test("does NOT call Tags API or reference tags", () => {
    expect(topicsContent).not.toContain("/api/v1/tags");
    expect(topicsContent).not.toContain("public/tags");
    expect(topicsContent).not.toContain("references/tags");
  });

  test("hides section by returning null when error or empty", () => {
    expect(topicsContent).toContain('if (result.status === "error" || result.status === "empty")');
    expect(topicsContent).toContain("return null");
  });

  test("does not import interactive map SDKs", () => {
    expect(topicsContent).not.toContain("leaflet");
    expect(topicsContent).not.toContain("mapbox-gl");
    expect(topicsContent).not.toContain("google.maps");
  });
});
