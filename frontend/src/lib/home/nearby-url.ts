import { SITE_ROUTES } from "@/components/navigation/navigation-config";

export interface NearbyUrlInput {
  latitude: number;
  longitude: number;
}

/**
  * Validates latitude value:
  * - Must be a finite number
  * - Must be between -90 and 90 inclusive
  */
export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

/**
  * Validates longitude value:
  * - Must be a finite number
  * - Must be between -180 and 180 inclusive
  */
export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

/**
  * Normalizes coordinate number to a clean decimal string:
  * - Rounds to maximum 6 decimal places
  * - Converts negative zero (-0) to "0"
  * - Does not produce scientific notation
  * - Uses standard dot separator
  */
export function normalizeCoordinate(value: number): string {
  // Normalize negative zero
  const normalizedValue = Object.is(value, -0) ? 0 : value;

  // Round to max 6 decimal places
  const rounded = Number(normalizedValue.toFixed(6));

  // Double check negative zero after rounding
  const finalValue = Object.is(rounded, -0) ? 0 : rounded;

  return finalValue.toString();
}

/**
  * Builds canonical nearby URL (/gan-toi?lat=...&lng=...)
  * Throws RangeError if latitude or longitude is invalid.
  */
export function buildNearbyUrl(input: NearbyUrlInput): string {
  const { latitude, longitude } = input;

  if (!isValidLatitude(latitude)) {
    throw new RangeError(`Invalid latitude value: ${String(latitude)}`);
  }

  if (!isValidLongitude(longitude)) {
    throw new RangeError(`Invalid longitude value: ${String(longitude)}`);
  }

  const latStr = normalizeCoordinate(latitude);
  const lngStr = normalizeCoordinate(longitude);

  const params = new URLSearchParams();
  params.set("lat", latStr);
  params.set("lng", lngStr);

  return `${SITE_ROUTES.nearby}?${params.toString()}`;
}
