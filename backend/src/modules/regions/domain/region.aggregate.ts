import { LtreePath } from './value-objects/ltree-path.vo';
import { GPSLocation } from './value-objects/gps-location.vo';
import {
  InvalidRegionNameError,
  InvalidRegionSlugError,
  InvalidRegionLevelError,
  RegionLocationMismatchError,
  RegionAccountDeletedError,
  InvalidRegionStatusTransitionError,
} from './region.errors';

export type RegionLevel = 0 | 1 | 2 | 3 | 4 | 5; // 0=Country, 1=Province, 2=District, 3=Commune, 4=Village, 5=Point/Place

export interface RegionProps {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  level: RegionLevel;
  path: LtreePath;
  latitude: number | null;
  longitude: number | null;
  geom: GPSLocation | null;
  description: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreateRegionProps = Omit<RegionProps, 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class Region {
  private _parentId: string | null;
  private _name: string;
  private _slug: string;
  private _level: RegionLevel;
  private _path: LtreePath;
  private _latitude: number | null;
  private _longitude: number | null;
  private _geom: GPSLocation | null;
  private _description: string | null;
  private _status: 'active' | 'inactive';
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  constructor(
    public readonly id: string,
    parentId: string | null,
    name: string,
    slug: string,
    level: RegionLevel,
    path: LtreePath,
    latitude: number | null,
    longitude: number | null,
    geom: GPSLocation | null,
    description: string | null,
    status: 'active' | 'inactive',
    public readonly createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
  ) {
    if (!name || name.trim() === '') {
      throw new InvalidRegionNameError('Region name cannot be empty');
    }

    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      throw new InvalidRegionSlugError('Region slug must be in valid format (^[a-z0-9_-]+$)');
    }

    if (level < 0 || level > 5) {
      throw new InvalidRegionLevelError('Region level must be between 0 and 5');
    }

    // Sync coordinate values if geom is provided
    let lat = latitude;
    let lng = longitude;
    if (geom) {
      if (latitude !== null && Math.abs(latitude - geom.lat) > 0.0001) {
        throw new RegionLocationMismatchError('Latitude does not match GPSLocation latitude');
      }
      if (longitude !== null && Math.abs(longitude - geom.lng) > 0.0001) {
        throw new RegionLocationMismatchError('Longitude does not match GPSLocation longitude');
      }
      lat = geom.lat;
      lng = geom.lng;
    } else if (latitude !== null || longitude !== null) {
      if (latitude === null || longitude === null) {
        throw new RegionLocationMismatchError('Both latitude and longitude must be provided together');
      }
    }

    this.id = id;
    this.createdAt = createdAt;
    this._parentId = parentId;
    this._name = name;
    this._slug = slug;
    this._level = level;
    this._path = path;
    this._latitude = lat;
    this._longitude = lng;
    this._geom = geom || (lat !== null && lng !== null ? new GPSLocation(lng, lat) : null);
    this._description = description;
    this._status = status;
    this._updatedAt = updatedAt;
    this._deletedAt = deletedAt;
  }

  // Domain Factories
  public static create(props: CreateRegionProps): Region {
    const now = new Date();
    return new Region(
      props.id,
      props.parentId,
      props.name,
      props.slug,
      props.level,
      props.path,
      props.latitude,
      props.longitude,
      props.geom,
      props.description,
      props.status,
      now,
      now,
      null
    );
  }

  public static rehydrate(props: RegionProps): Region {
    return new Region(
      props.id,
      props.parentId,
      props.name,
      props.slug,
      props.level,
      props.path,
      props.latitude,
      props.longitude,
      props.geom,
      props.description,
      props.status,
      props.createdAt,
      props.updatedAt,
      props.deletedAt
    );
  }

  // Getters
  public get parentId(): string | null {
    return this._parentId;
  }

  public get name(): string {
    return this._name;
  }

  public get slug(): string {
    return this._slug;
  }

  public get level(): RegionLevel {
    return this._level;
  }

  public get path(): LtreePath {
    return this._path;
  }

  public get latitude(): number | null {
    return this._latitude;
  }

  public get longitude(): number | null {
    return this._longitude;
  }

  public get geom(): GPSLocation | null {
    return this._geom;
  }

  public get description(): string | null {
    return this._description;
  }

  public get status(): 'active' | 'inactive' {
    return this._status;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get deletedAt(): Date | null {
    return this._deletedAt;
  }

  // Business Methods
  public rename(newName: string, newSlug: string): void {
    this.ensureNotDeleted();
    if (!newName || newName.trim() === '') {
      throw new InvalidRegionNameError('Region name cannot be empty');
    }
    if (!newSlug || !/^[a-z0-9_-]+$/.test(newSlug)) {
      throw new InvalidRegionSlugError('Region slug must be in valid format (^[a-z0-9_-]+$)');
    }
    this._name = newName;
    this._slug = newSlug;
    this.touch();
  }

  public move(newParentId: string | null, newPath: LtreePath, newLevel: RegionLevel): void {
    this.ensureNotDeleted();
    if (newLevel < 0 || newLevel > 5) {
      throw new InvalidRegionLevelError('Region level must be between 0 and 5');
    }
    this._parentId = newParentId;
    this._path = newPath;
    this._level = newLevel;
    this.touch();
  }

  public updateLocation(geom: GPSLocation | null): void {
    this.ensureNotDeleted();
    this._geom = geom;
    this._latitude = geom ? geom.lat : null;
    this._longitude = geom ? geom.lng : null;
    this.touch();
  }

  public changeDescription(newDesc: string | null): void {
    this.ensureNotDeleted();
    this._description = newDesc;
    this.touch();
  }

  public deactivate(): void {
    this.ensureNotDeleted();
    this._status = 'inactive';
    this.touch();
  }

  public activate(): void {
    this.ensureNotDeleted();
    this._status = 'active';
    this.touch();
  }

  public softDelete(): void {
    if (this.isDeleted()) {
      return;
    }
    this._status = 'inactive';
    this._deletedAt = new Date();
    this.touch();
  }

  public restore(): void {
    if (!this.isDeleted()) {
      throw new InvalidRegionStatusTransitionError('Region is not deleted');
    }
    this._deletedAt = null;
    this._status = 'inactive';
    this.touch();
  }

  // Helpers
  public isRoot(): boolean {
    return this._parentId === null;
  }

  public isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  public isActive(): boolean {
    return this._status === 'active' && !this.isDeleted();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted()) {
      throw new RegionAccountDeletedError('Action cannot be performed on a deleted region');
    }
  }

  // Serialization Helper
  public toSnapshot(): RegionProps {
    return {
      id: this.id,
      parentId: this.parentId,
      name: this.name,
      slug: this.slug,
      level: this.level,
      path: this.path,
      latitude: this.latitude,
      longitude: this.longitude,
      geom: this.geom,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
