import { describe, expect, test } from "bun:test";
import {
  buildGoogleMapsDirectionsUrl,
  getSafeZaloUrl,
  hasValidCoordinates,
  normalizePhoneHref,
} from "@/lib/contact";

describe("contact utilities", () => {
  test("normalizes safe phone numbers and rejects unsafe values", () => {
    expect(normalizePhoneHref("098 765 4321")).toBe("tel:0987654321");
    expect(normalizePhoneHref("+84 98 765 4321")).toBe("tel:+84987654321");
    expect(normalizePhoneHref("javascript:alert(1)")).toBeNull();
  });

  test("accepts only trusted Zalo hosts or phone identifiers", () => {
    expect(getSafeZaloUrl("0987654321")).toBe("https://zalo.me/0987654321");
    expect(getSafeZaloUrl("https://zalo.me/0987654321")).toBe(
      "https://zalo.me/0987654321",
    );
    expect(getSafeZaloUrl("https://evil.example/zalo.me/0987654321")).toBeNull();
    expect(getSafeZaloUrl("javascript:alert(1)")).toBeNull();
  });

  test("builds Google Maps deep links only for valid coordinates", () => {
    expect(hasValidCoordinates(22.583421, 104.698123)).toBe(true);
    expect(buildGoogleMapsDirectionsUrl(22.583421, 104.698123)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=22.583421%2C104.698123&travelmode=driving",
    );
    expect(buildGoogleMapsDirectionsUrl(91, 104.698123)).toBeNull();
  });
});
