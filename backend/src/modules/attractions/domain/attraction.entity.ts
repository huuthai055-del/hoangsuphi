import type { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { AttractionDomainError } from './attraction.errors';

export type AttractionStatus = 'active' | 'inactive';

export interface AttractionProps {
  id: string;
  regionId: string;
  categoryId: string;
  name: string;
  slug: string;
  location: GPSLocation;
  description: string | null;
  coverUrl: string | null;
  status: AttractionStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Attraction {
  private _id: string;
  private _regionId: string;
  private _categoryId: string;
  private _name: string;
  private _slug: string;
  private _location: GPSLocation;
  private _description: string | null;
  private _coverUrl: string | null;
  private _status: AttractionStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: AttractionProps) {
    this._id = props.id;
    this._regionId = props.regionId;
    this._categoryId = props.categoryId;
    this._name = props.name;
    this._slug = props.slug;
    this._location = props.location;
    this._description = props.description;
    this._coverUrl = props.coverUrl;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get regionId(): string {
    return this._regionId;
  }
  public get categoryId(): string {
    return this._categoryId;
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
  public get status(): AttractionStatus {
    return this._status;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }
  public get deletedAt(): Date | null {
    return this._deletedAt;
  }

  // Validation
  private static validate(props: Partial<AttractionProps>): void {
    if (props.id !== undefined && (!props.id || props.id.trim() === '')) {
      throw new AttractionDomainError('Attraction ID is required');
    }
    if (props.regionId !== undefined && (!props.regionId || props.regionId.trim() === '')) {
      throw new AttractionDomainError('Region ID is required');
    }
    if (props.categoryId !== undefined && (!props.categoryId || props.categoryId.trim() === '')) {
      throw new AttractionDomainError('Category ID is required');
    }
    if (props.name !== undefined && (!props.name || props.name.trim() === '')) {
      throw new AttractionDomainError('Attraction name is required');
    }
    if (props.slug !== undefined && (!props.slug || props.slug.trim() === '')) {
      throw new AttractionDomainError('Attraction slug is required');
    }
  }

  // Domain Factories
  public static create(
    props: Omit<AttractionProps, 'createdAt' | 'updatedAt' | 'deletedAt'>,
    now?: Date
  ): Attraction {
    Attraction.validate(props);
    const timestamp = now ?? new Date();
    return new Attraction({
      ...props,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });
  }

  public static rehydrate(props: AttractionProps): Attraction {
    Attraction.validate(props);
    return new Attraction(props);
  }

  // Mutators
  public update(
    props: {
      regionId?: string;
      categoryId?: string;
      name?: string;
      slug?: string;
      location?: GPSLocation;
      description?: string | null;
      coverUrl?: string | null;
      status?: AttractionStatus;
    },
    now?: Date
  ): void {
    if (props.regionId !== undefined) {
      if (!props.regionId || props.regionId.trim() === '')
        throw new AttractionDomainError('Region ID is required');
      this._regionId = props.regionId;
    }
    if (props.categoryId !== undefined) {
      if (!props.categoryId || props.categoryId.trim() === '')
        throw new AttractionDomainError('Category ID is required');
      this._categoryId = props.categoryId;
    }
    if (props.name !== undefined) {
      if (!props.name || props.name.trim() === '')
        throw new AttractionDomainError('Attraction name is required');
      this._name = props.name.trim();
    }
    if (props.slug !== undefined) {
      if (!props.slug || props.slug.trim() === '')
        throw new AttractionDomainError('Attraction slug is required');
      const cleanSlug = props.slug.trim();
      if (this._status === 'active' && this._slug !== cleanSlug) {
        throw new AttractionDomainError('Slug is immutable once attraction is active');
      }
      this._slug = cleanSlug;
    }
    if (props.location !== undefined) this._location = props.location;
    if (props.description !== undefined) this._description = props.description;
    if (props.coverUrl !== undefined) this._coverUrl = props.coverUrl;
    if (props.status !== undefined) this._status = props.status;

    this._updatedAt = now ?? new Date();
  }

  public activate(now?: Date): void {
    this._status = 'active';
    this._updatedAt = now ?? new Date();
  }

  public deactivate(now?: Date): void {
    this._status = 'inactive';
    this._updatedAt = now ?? new Date();
  }

  public softDelete(now?: Date): void {
    this._deletedAt = now ?? new Date();
    this._updatedAt = now ?? new Date();
  }

  public get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  public get isActive(): boolean {
    return this._status === 'active' && !this.isDeleted;
  }
}
