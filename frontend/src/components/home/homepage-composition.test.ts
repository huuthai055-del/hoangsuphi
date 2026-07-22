import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadHomepageModule } from "@/lib/home/homepage-module-result";

const frontendRoot = join(process.cwd());
const pageFilePath = join(frontendRoot, "src", "app", "page.tsx");
const pageContent = readFileSync(pageFilePath, "utf-8");

describe("Step 5.2.2 — Homepage Server Composition Architecture", () => {
  test("page.tsx is a Server Component without 'use client'", () => {
    expect(pageContent).not.toContain('"use client"');
    expect(pageContent).not.toContain("'use client'");
  });

  test("page.tsx does not import or render SiteHeader or SiteFooter", () => {
    expect(pageContent).not.toContain("SiteHeader");
    expect(pageContent).not.toContain("Header");
    expect(pageContent).not.toContain("SiteFooter");
    expect(pageContent).not.toContain("Footer");
  });

  test("page.tsx does not render a nested <main> landmark", () => {
    expect(pageContent).not.toContain("<main");
    expect(pageContent).not.toContain("</main>");
  });

  test("page.tsx does not contain direct backend fetch calls", () => {
    expect(pageContent).not.toContain("fetch(");
    expect(pageContent).not.toContain("Promise.all(");
    expect(pageContent).not.toContain("Promise.allSettled(");
  });

  test("page.tsx uses independent Suspense boundaries for async sections", () => {
    const suspenseMatches = pageContent.match(/<Suspense/g);
    expect(suspenseMatches).not.toBeNull();
    expect(suspenseMatches!.length).toBeGreaterThanOrEqual(4);
  });

  test("loadHomepageModule handles success, empty, and error results safely", async () => {
    const successResult = await loadHomepageModule(async () => ["item1", "item2"]);
    expect(successResult).toEqual({ status: "success", data: ["item1", "item2"] });

    const emptyArrayResult = await loadHomepageModule(async () => []);
    expect(emptyArrayResult).toEqual({ status: "empty" });

    const nullResult = await loadHomepageModule(async () => null);
    expect(nullResult).toEqual({ status: "empty" });

    const errorResult = await loadHomepageModule(async () => {
      throw new Error("API Failure Simulation");
    });
    expect(errorResult).toEqual({ status: "error" });
  });

  test("Nearby stays a click-only geolocation action and no map SDK is imported", () => {
    const homeDir = join(frontendRoot, "src", "components", "home");
    const files = [
      "hero-section.tsx",
      "harvest-status-section.tsx",
      "seasonal-navigation.tsx",
      "explore-suggestions.tsx",
      "featured-topics.tsx",
      "quick-nearby-slot.tsx",
      "homepage-section-skeleton.tsx",
      "homepage-module-fallback.tsx",
    ];

    for (const file of files) {
      const content = readFileSync(join(homeDir, file), "utf-8");
      expect(content).not.toContain("leaflet");
      expect(content).not.toContain("mapbox-gl");
      expect(content).not.toContain("google.maps");
      expect(content).not.toContain("document");
      expect(content).not.toContain("localStorage");
    }

    const nearbyContent = readFileSync(join(homeDir, "quick-nearby.tsx"), "utf-8");
    expect(nearbyContent).toContain('"use client"');
    expect(nearbyContent).toContain("navigator.geolocation.getCurrentPosition");
    expect(nearbyContent).toContain("buildNearbyUrl");
  });
});
