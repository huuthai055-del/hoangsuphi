export class GPSLocation {
  constructor(
    public readonly lng: number,
    public readonly lat: number
  ) {
    if (lng < -180 || lng > 180) {
      throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180.`);
    }
    if (lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
    }
  }

  public toWkt(): string {
    return `SRID=4326;POINT(${this.lng} ${this.lat})`;
  }
}
