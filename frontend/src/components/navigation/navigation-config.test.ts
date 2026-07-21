import { describe, expect, test } from "bun:test";
import {
  isNavigationItemActive,
  NAVIGATION_CONFIG,
  SITE_ROUTES,
} from "@/components/navigation/navigation-config";

describe("navigation config", () => {
  test("contains no interactive map route", () => {
    expect(Object.values(SITE_ROUTES)).not.toContain("/ban-do");
    expect(NAVIGATION_CONFIG.some((item) => item.href.includes("/ban-do"))).toBe(false);
  });

  test("distinguishes accommodation and food by URL query", () => {
    const accommodation = NAVIGATION_CONFIG.find((item) => item.id === "accommodation");
    const food = NAVIGATION_CONFIG.find((item) => item.id === "food");
    if (!accommodation || !food) throw new Error("required navigation item missing");

    expect(
      isNavigationItemActive(
        accommodation,
        "/co-so",
        new URLSearchParams("type=homestay"),
      ),
    ).toBe(true);
    expect(
      isNavigationItemActive(food, "/co-so", new URLSearchParams("type=homestay")),
    ).toBe(false);
  });
});
