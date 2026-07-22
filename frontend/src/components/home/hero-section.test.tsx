import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const heroPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "hero-section.tsx"
);
const heroContent = readFileSync(heroPath, "utf-8");

describe("HeroSection Architecture & Content Contract", () => {
  test("Hero is a Server Component without 'use client'", () => {
    expect(heroContent).not.toContain('"use client"');
  });

  test("Hero contains the unique H1 on Homepage", () => {
    expect(heroContent).toContain("<h1");
    expect(heroContent).toContain("Khám phá Hoàng Su Phì");
  });

  test("Hero uses the approved local development hero asset responsively", () => {
    expect(heroContent).toContain('src="/images/home/hoang-su-phi-hero.webp"');
    expect(heroContent).toContain("priority");
    expect(heroContent).toContain("sizes=");
  });

  test("Hero contains required brand description and CTAs", () => {
    expect(heroContent).toContain("Ruộng bậc thang, bản làng và những trải nghiệm địa phương");
    expect(heroContent).toContain("Khám phá địa điểm");
    expect(heroContent).toContain('href="/dia-diem"');
    expect(heroContent).toContain("QuickNearby");
  });

  test("Hero integrates GlobalSearch variant='hero'", () => {
    expect(heroContent).toContain('GlobalSearch variant="hero"');
  });

  test("Hero integrates optional HeroHarvestBadge with Suspense fallback", () => {
    expect(heroContent).toContain("HeroHarvestBadge");
    expect(heroContent).toContain("<Suspense fallback={null}>");
  });

  test("Hero does not import interactive map SDKs", () => {
    expect(heroContent).not.toContain("leaflet");
    expect(heroContent).not.toContain("mapbox-gl");
    expect(heroContent).not.toContain("google.maps");
  });
});
