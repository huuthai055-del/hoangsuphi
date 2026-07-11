import type { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';

export class Business {
  constructor(
    public readonly id: string,
    public regionId: string,
    public businessTypeId: string,
    public name: string,
    public slug: string,
    public location: GPSLocation,
    public description: string | null,
    public coverUrl: string | null,
    public status: 'active' | 'inactive',
    public amenityIds: string[],
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null
  ) {}

  public activate(): void {
    this.status = 'active';
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.status = 'inactive';
    this.updatedAt = new Date();
  }

  public softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }
}
