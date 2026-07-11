import type { LtreePath } from './value-objects/ltree-path.vo';
import type { GPSLocation } from './value-objects/gps-location.vo';

export type RegionLevel = 0 | 1 | 2 | 3 | 4 | 5; // 0=Country, 1=Province, 2=District, 3=Commune, 4=Village, 5=Point/Place

export class Region {
  constructor(
    public readonly id: string,
    public parentId: string | null,
    public name: string,
    public slug: string,
    public level: RegionLevel,
    public path: LtreePath,
    public latitude: number | null,
    public longitude: number | null,
    public geom: GPSLocation | null,
    public description: string | null,
    public status: 'active' | 'inactive',
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null
  ) {}

  public deactivate(): void {
    this.status = 'inactive';
    this.updatedAt = new Date();
  }

  public activate(): void {
    this.status = 'active';
    this.updatedAt = new Date();
  }

  public softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  public isRoot(): boolean {
    return this.level === 1;
  }
}
