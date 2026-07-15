import type { GPSLocation } from './value-objects/gps-location.vo';
import {
  InvalidPlaceNameError,
  InvalidPlaceSlugError,
  InvalidPlaceRegionError,
  InvalidPlaceCoverUrlError,
  PlaceDeletedError,
  InvalidPlaceStatusTransitionError,
} from './place.errors';

export interface TouristPlaceProps {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  location: GPSLocation;
  description: string | null;
  coverUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreateTouristPlaceProps = Omit<TouristPlaceProps, 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class TouristPlace {
  private _regionId: string;
  private _name: string;
  private _slug: string;
  private _location: GPSLocation;
  private _description: string | null;
  private _coverUrl: string | null;
  private _status: 'active' | 'inactive';
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  constructor(
    public readonly id: string,
    regionId: string,
    name: string,
    slug: string,
    location: GPSLocation,
    description: string | null,
    coverUrl: string | null,
    status: 'active' | 'inactive',
    public readonly createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
  ) {
    if (!name || name.trim() === '') {
      throw new InvalidPlaceNameError('Place name cannot be empty');
    }
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      throw new InvalidPlaceSlugError('Place slug must be in valid format (^[a-z0-9_-]+$)');
    }
    if (!regionId || regionId.trim() === '') {
      throw new InvalidPlaceRegionError('Region ID is required');
    }
    if (coverUrl && !/^https?:\/\/.+$/.test(coverUrl)) {
      throw new InvalidPlaceCoverUrlError('Cover URL must be a valid URL starting with http/https');
    }

    this.id = id;
    this.createdAt = createdAt;
    this._regionId = regionId;
    this._name = name;
    this._slug = slug;
    this._location = location;
    this._description = description;
    this._coverUrl = coverUrl;
    this._status = status;
    this._updatedAt = updatedAt;
    this._deletedAt = deletedAt;
  }

  // Domain Factories
  public static create(props: CreateTouristPlaceProps): TouristPlace {
    const now = new Date();
    return new TouristPlace(
      props.id,
      props.regionId,
      props.name,
      props.slug,
      props.location,
      props.description,
      props.coverUrl,
      props.status,
      now,
      now,
      null
    );
  }

  public static rehydrate(props: TouristPlaceProps): TouristPlace {
    return new TouristPlace(
      props.id,
      props.regionId,
      props.name,
      props.slug,
      props.location,
      props.description,
      props.coverUrl,
      props.status,
      props.createdAt,
      props.updatedAt,
      props.deletedAt
    );
  }

  // Getters
  public get regionId(): string {
    return this._regionId;
  }

  public get name(): string {
    return this._name;
  }

  public get slug(): string {
    return this._slug;
  }

  public get location(): GPSLocation {
    return this._location;
  }

  public get description(): string | null {
    return this._description;
  }

  public get coverUrl(): string | null {
    return this._coverUrl;
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
      throw new InvalidPlaceNameError('Place name cannot be empty');
    }
    if (!newSlug || !/^[a-z0-9_-]+$/.test(newSlug)) {
      throw new InvalidPlaceSlugError('Place slug must be in valid format (^[a-z0-9_-]+$)');
    }
    this._name = newName;
    this._slug = newSlug;
    this.touch();
  }

  public changeRegion(newRegionId: string): void {
    this.ensureNotDeleted();
    if (!newRegionId || newRegionId.trim() === '') {
      throw new InvalidPlaceRegionError('Region ID is required');
    }
    this._regionId = newRegionId;
    this.touch();
  }

  public updateLocation(newLocation: GPSLocation): void {
    this.ensureNotDeleted();
    this._location = newLocation;
    this.touch();
  }

  public changeCover(newCoverUrl: string | null): void {
    this.ensureNotDeleted();
    if (newCoverUrl && !/^https?:\/\/.+$/.test(newCoverUrl)) {
      throw new InvalidPlaceCoverUrlError('Cover URL must be a valid URL starting with http/https');
    }
    this._coverUrl = newCoverUrl;
    this.touch();
  }

  public updateDescription(newDesc: string | null): void {
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
      throw new InvalidPlaceStatusTransitionError('Tourist place is not deleted');
    }
    this._deletedAt = null;
    this._status = 'inactive';
    this.touch();
  }

  // Helpers
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
      throw new PlaceDeletedError('Action cannot be performed on a deleted tourist place');
    }
  }

  // Serialization Helper
  public toSnapshot(): TouristPlaceProps {
    return {
      id: this.id,
      regionId: this.regionId,
      name: this.name,
      slug: this.slug,
      location: this.location,
      description: this.description,
      coverUrl: this.coverUrl,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
