export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasValidCoordinates(latitude: number, longitude: number): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

export function buildGoogleMapsDirectionsUrl(
  latitude: number,
  longitude: number,
  travelMode: "driving" | "walking" | "bicycling" | "transit" = "driving",
): string | null {
  if (!hasValidCoordinates(latitude, longitude)) {
    return null;
  }

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${latitude},${longitude}`);
  url.searchParams.set("travelmode", travelMode);
  return url.toString();
}
