import type { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { BusinessDomainError } from './business.errors';

export interface BusinessProps {
  id: string;
  regionId: string;
  businessTypeId: string;
  name: string;
  slug: string;
  location: GPSLocation;
  description: string | null;
  coverUrl: string | null;
  priceMin: string | null;
  priceMax: string | null;
  status: 'active' | 'inactive';
  amenityIds: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Business {
  private _id: string;
  private _regionId: string;
  private _businessTypeId: string;
  private _name: string;
  private _slug: string;
  private _location: GPSLocation;
  private _description: string | null;
  private _coverUrl: string | null;
  private _priceMin: string | null;
  private _priceMax: string | null;
  private _status: 'active' | 'inactive';
  private _amenityIds: string[];
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: BusinessProps) {
    this._id = props.id;
    this._regionId = props.regionId;
    this._businessTypeId = props.businessTypeId;
    this._name = props.name;
    this._slug = props.slug;
    this._location = props.location;
    this._description = props.description;
    this._coverUrl = props.coverUrl;
    this._priceMin = props.priceMin;
    this._priceMax = props.priceMax;
    this._status = props.status;
    this._amenityIds = props.amenityIds;
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
  public get businessTypeId(): string {
    return this._businessTypeId;
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
  public get priceMin(): string | null {
    return this._priceMin;
  }
  public get priceMax(): string | null {
    return this._priceMax;
  }
  public get status(): 'active' | 'inactive' {
    return this._status;
  }
  public get amenityIds(): string[] {
    return this._amenityIds;
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
  private static validate(props: Partial<BusinessProps>): void {
    if (props.id !== undefined && (!props.id || props.id.trim() === '')) {
      throw new BusinessDomainError('Business ID is required');
    }
    if (props.regionId !== undefined && (!props.regionId || props.regionId.trim() === '')) {
      throw new BusinessDomainError('Region ID is required');
    }
    if (
      props.businessTypeId !== undefined &&
      (!props.businessTypeId || props.businessTypeId.trim() === '')
    ) {
      throw new BusinessDomainError('Business Type ID is required');
    }
    if (props.name !== undefined && (!props.name || props.name.trim() === '')) {
      throw new BusinessDomainError('Business name is required');
    }
    if (props.slug !== undefined && (!props.slug || props.slug.trim() === '')) {
      throw new BusinessDomainError('Business slug is required');
    }
    if (props.priceMin !== undefined || props.priceMax !== undefined) {
      Business.validatePriceRange(props.priceMin ?? null, props.priceMax ?? null);
    }
  }

  private static validatePriceRange(priceMin: string | null, priceMax: string | null): void {
    if ((priceMin === null) !== (priceMax === null)) {
      throw new BusinessDomainError('Business price minimum and maximum must be provided together');
    }
    if (priceMin === null || priceMax === null) return;

    const moneyPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u;
    if (!moneyPattern.test(priceMin) || !moneyPattern.test(priceMax)) {
      throw new BusinessDomainError('Business prices must be valid NUMERIC(12,2) values');
    }
    const toMinorUnits = (value: string): bigint => {
      const [integerPart = '0', fractionPart = ''] = value.split('.');
      return BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, '0'));
    };
    if (toMinorUnits(priceMax) < toMinorUnits(priceMin)) {
      throw new BusinessDomainError(
        'Business price maximum must be greater than or equal to minimum'
      );
    }
  }

  // Domain Factories
  public static create(
    props: Omit<BusinessProps, 'createdAt' | 'updatedAt' | 'deletedAt'>,
    now?: Date
  ): Business {
    Business.validate(props);
    const timestamp = now ?? new Date();
    return new Business({
      ...props,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });
  }

  public static rehydrate(props: BusinessProps): Business {
    Business.validate(props);
    return new Business(props);
  }

  // Mutators
  public update(
    props: {
      regionId?: string;
      businessTypeId?: string;
      name?: string;
      slug?: string;
      location?: GPSLocation;
      description?: string | null;
      coverUrl?: string | null;
      priceMin?: string | null;
      priceMax?: string | null;
      status?: 'active' | 'inactive';
      amenityIds?: string[];
    },
    now?: Date
  ): void {
    if (props.regionId !== undefined) {
      if (!props.regionId || props.regionId.trim() === '')
        throw new BusinessDomainError('Region ID is required');
      this._regionId = props.regionId;
    }
    if (props.businessTypeId !== undefined) {
      if (!props.businessTypeId || props.businessTypeId.trim() === '')
        throw new BusinessDomainError('Business Type ID is required');
      this._businessTypeId = props.businessTypeId;
    }
    if (props.name !== undefined) {
      if (!props.name || props.name.trim() === '')
        throw new BusinessDomainError('Business name is required');
      this._name = props.name.trim();
    }
    if (props.slug !== undefined) {
      if (!props.slug || props.slug.trim() === '')
        throw new BusinessDomainError('Business slug is required');
      this._slug = props.slug.trim();
    }
    if (props.location !== undefined) this._location = props.location;
    if (props.description !== undefined) this._description = props.description;
    if (props.coverUrl !== undefined) this._coverUrl = props.coverUrl;
    if (props.priceMin !== undefined || props.priceMax !== undefined) {
      const priceMin = props.priceMin === undefined ? this._priceMin : props.priceMin;
      const priceMax = props.priceMax === undefined ? this._priceMax : props.priceMax;
      Business.validatePriceRange(priceMin, priceMax);
      this._priceMin = priceMin;
      this._priceMax = priceMax;
    }
    if (props.status !== undefined) this._status = props.status;
    if (props.amenityIds !== undefined) this._amenityIds = props.amenityIds;

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
}
