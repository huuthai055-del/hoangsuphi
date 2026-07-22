import { describe, expect, test } from "bun:test";
import {
  buildNearbyUrl,
  isValidLatitude,
  isValidLongitude,
  normalizeCoordinate,
} from "./nearby-url";

describe("Nearby URL Utility & Coordinate Validation", () => {
  test("isValidLatitude accepts valid numbers in range [-90, 90]", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(22.123456)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);

    expect(isValidLatitude(-90.1)).toBe(false);
    expect(isValidLatitude(90.1)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
    expect(isValidLatitude(-Infinity)).toBe(false);
    expect(isValidLatitude("22.123")).toBe(false);
    expect(isValidLatitude(null)).toBe(false);
    expect(isValidLatitude(undefined)).toBe(false);
  });

  test("isValidLongitude accepts valid numbers in range [-180, 180]", () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(104.123456)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);

    expect(isValidLongitude(-180.1)).toBe(false);
    expect(isValidLongitude(180.1)).toBe(false);
    expect(isValidLongitude(NaN)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
    expect(isValidLongitude(-Infinity)).toBe(false);
    expect(isValidLongitude("104.123")).toBe(false);
    expect(isValidLongitude(null)).toBe(false);
    expect(isValidLongitude(undefined)).toBe(false);
  });

  test("normalizeCoordinate rounds to max 6 decimal places and handles negative zero", () => {
    expect(normalizeCoordinate(22.12345678)).toBe("22.123457");
    expect(normalizeCoordinate(104.5)).toBe("104.5");
    expect(normalizeCoordinate(0)).toBe("0");
    expect(normalizeCoordinate(-0)).toBe("0");
    expect(normalizeCoordinate(-22.12345678)).toBe("-22.123457");
  });

  test("buildNearbyUrl creates canonical URL with lat and lng query params", () => {
    const url = buildNearbyUrl({ latitude: 22.123456, longitude: 104.654321 });
    expect(url).toBe("/gan-toi?lat=22.123456&lng=104.654321");
  });

  test("buildNearbyUrl preserves latitude = 0 and longitude = 0", () => {
    const url = buildNearbyUrl({ latitude: 0, longitude: 0 });
    expect(url).toBe("/gan-toi?lat=0&lng=0");
  });

  test("buildNearbyUrl rejects invalid coordinates and throws RangeError", () => {
    expect(() => buildNearbyUrl({ latitude: 100, longitude: 104 })).toThrow(RangeError);
    expect(() => buildNearbyUrl({ latitude: 22, longitude: 200 })).toThrow(RangeError);
    expect(() => buildNearbyUrl({ latitude: NaN, longitude: 104 })).toThrow(RangeError);
  });
});
