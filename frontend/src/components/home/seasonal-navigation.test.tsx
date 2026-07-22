import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const seasonalPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "seasonal-navigation.tsx"
);
const seasonalContent = readFileSync(seasonalPath, "utf-8");

describe("SeasonalNavigation Architecture & Accessibility Contract", () => {
  test("SeasonalNavigation is a Server Component without 'use client'", () => {
    expect(seasonalContent).not.toContain('"use client"');
  });

  test("uses semantic section, nav element, and H2 heading", () => {
    expect(seasonalContent).toContain('aria-labelledby="seasonal-nav-heading"');
    expect(seasonalContent).toContain('id="seasonal-nav-heading"');
    expect(seasonalContent).toContain("<h2");
    expect(seasonalContent).toContain("Khám phá theo khu vực");
    expect(seasonalContent).toContain('aria-label="Khám phá theo khu vực"');
  });

  test("links use canonical /khu-vuc/[slug] routes without hard-coded UUIDs", () => {
    expect(seasonalContent).toContain('href={`/khu-vuc/${item.slug}`}');
    expect(seasonalContent).not.toContain("localhost:3001");
    expect(seasonalContent).not.toContain("INTERNAL_BACKEND_URL");
  });

  test("hides section by returning null when error or empty", () => {
    expect(seasonalContent).toContain('if (result.status === "error" || result.status === "empty")');
    expect(seasonalContent).toContain("return null");
  });

  test("does not import interactive map SDKs", () => {
    expect(seasonalContent).not.toContain("leaflet");
    expect(seasonalContent).not.toContain("mapbox-gl");
    expect(seasonalContent).not.toContain("google.maps");
  });
});
