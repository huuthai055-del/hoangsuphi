import { customType } from 'drizzle-orm/pg-core';

// ─── PostGIS Point Type ──────────────────────────────────────────────────────
export interface Point {
  lng: number;
  lat: number;
}

export const point = customType<{ data: Point; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
  toDriver(value: Point): string {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value: string): Point {
    const match = value.match(/POINT\(([^ ]+)\s+([^ ]+)\)/);
    if (!match) {
      throw new Error(`Invalid Point format from database: ${value}`);
    }
    return {
      lng: Number.parseFloat(match[1] || '0'),
      lat: Number.parseFloat(match[2] || '0'),
    };
  },
});

// ─── PostgreSQL ltree Type ───────────────────────────────────────────────────
export const ltree = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'ltree';
  },
  toDriver(value: string): string {
    const normalized = value.replace(/-/g, '_');
    if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/.test(normalized)) {
      throw new Error(`Invalid ltree format: ${value}`);
    }
    return normalized;
  },
  fromDriver(value: string): string {
    return value;
  },
});
