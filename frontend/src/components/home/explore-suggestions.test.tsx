import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const suggestionsPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "explore-suggestions.tsx"
);
const suggestionsContent = readFileSync(suggestionsPath, "utf-8");

describe("ExploreSuggestions Architecture & Contract", () => {
  test("ExploreSuggestions is a Server Component without 'use client'", () => {
    expect(suggestionsContent).not.toContain('"use client"');
  });

  test("uses semantic section with aria-labelledby and H2 heading 'Gợi ý khám phá'", () => {
    expect(suggestionsContent).toContain('aria-labelledby="explore-suggestions-heading"');
    expect(suggestionsContent).toContain('id="explore-suggestions-heading"');
    expect(suggestionsContent).toContain("<h2");
    expect(suggestionsContent).toContain("Gợi ý khám phá");
  });

  test("does NOT contain 'Top Picks', rating claims, or unverified badges", () => {
    expect(suggestionsContent).not.toContain("Top Picks");
    expect(suggestionsContent).not.toContain("top picks");
    expect(suggestionsContent).not.toContain("Địa điểm tốt nhất");
    expect(suggestionsContent).not.toContain("Điểm đến hàng đầu");
  });

  test("does NOT contain Directions, Google Maps, or coordinate attributes", () => {
    expect(suggestionsContent).not.toContain("latitude");
    expect(suggestionsContent).not.toContain("longitude");
    expect(suggestionsContent).not.toContain("distance");
    expect(suggestionsContent).not.toContain("maps.google.com");
    expect(suggestionsContent).not.toContain("Chỉ đường");
  });

  test("contains safe fallback message for empty/error state", () => {
    expect(suggestionsContent).toContain("Các điểm đến đang được cập nhật.");
  });

  test("does not import interactive map SDKs", () => {
    expect(suggestionsContent).not.toContain("leaflet");
    expect(suggestionsContent).not.toContain("mapbox-gl");
    expect(suggestionsContent).not.toContain("google.maps");
  });
});
