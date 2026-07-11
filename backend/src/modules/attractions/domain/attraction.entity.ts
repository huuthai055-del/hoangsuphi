import type { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';

export type AttractionStatus = 'active' | 'inactive';

export class Attraction {
  constructor(
    public readonly id: string,
    public regionId: string,
    public categoryId: string,
    public name: string,
    public slug: string,
    public location: GPSLocation,
    public description: string | null,
    public coverUrl: string | null,
    public status: AttractionStatus,
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

  public get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  public get isActive(): boolean {
    return this.status === 'active' && !this.isDeleted;
  }
}
