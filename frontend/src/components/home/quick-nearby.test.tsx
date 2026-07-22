import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const quickNearbyPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "quick-nearby.tsx"
);
const heroSectionPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "hero-section.tsx"
);

const quickNearbyContent = readFileSync(quickNearbyPath, "utf-8");
const heroSectionContent = readFileSync(heroSectionPath, "utf-8");

describe("QuickNearby Architecture & Security Contracts", () => {
  test("QuickNearby is a Client Component with 'use client'", () => {
    expect(quickNearbyContent).toContain('"use client"');
  });

  test("HeroSection remains a Server Component without 'use client'", () => {
    expect(heroSectionContent).not.toContain('"use client"');
  });

  test("does NOT use watchPosition or continuous tracking", () => {
    expect(quickNearbyContent).not.toContain("watchPosition");
  });

  test("does NOT store position in persistent storage (localStorage/sessionStorage/cookies)", () => {
    expect(quickNearbyContent).not.toContain("localStorage");
    expect(quickNearbyContent).not.toContain("sessionStorage");
    expect(quickNearbyContent).not.toContain("cookie");
  });

  test("does NOT log coordinates or position to console", () => {
    expect(quickNearbyContent).not.toContain("console.log");
    expect(quickNearbyContent).not.toContain("console.error");
  });

  test("does NOT import interactive map SDKs", () => {
    expect(quickNearbyContent).not.toContain("leaflet");
    expect(quickNearbyContent).not.toContain("mapbox-gl");
    expect(quickNearbyContent).not.toContain("google.maps");
  });

  test("uses native button with accessible type='button'", () => {
    expect(quickNearbyContent).toContain('type="button"');
  });

  test("includes polite aria-live status region for accessibility", () => {
    expect(quickNearbyContent).toContain('role="status"');
    expect(quickNearbyContent).toContain('aria-live="polite"');
  });

  test("uses buildNearbyUrl for canonical /gan-toi navigation", () => {
    expect(quickNearbyContent).toContain("buildNearbyUrl");
  });
});
