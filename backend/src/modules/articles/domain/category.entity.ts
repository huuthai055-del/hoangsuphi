import { CategoryDomainError } from './article-errors';

const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CategoryProps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  private _id: string;
  private _code: string;
  private _name: string;
  private _description: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CategoryProps) {
    this._id = props.id;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Helper to resolve timestamp
  private static resolveNow(now?: Date): Date {
    return now ?? new Date();
  }

  // Pure Validators
  private static validateId(id: string): void {
    if (!id || id.trim() === '') {
      throw new CategoryDomainError('Category ID is required');
    }
  }

  private static validateCode(code: string): void {
    if (!code || code.trim() === '') {
      throw new CategoryDomainError('Category code is required');
    }
    const cleanCode = code.trim();
    if (!SEO_SLUG_REGEX.test(cleanCode)) {
      throw new CategoryDomainError(
        'Category code must be a valid SEO slug format (lowercase alphanumeric and single dashes, no leading/trailing dashes)'
      );
    }
  }

  private static validateName(name: string): void {
    const cleanName = name?.trim();
    if (!cleanName || cleanName === '') {
      throw new CategoryDomainError('Category name cannot be blank');
    }
    if (cleanName.length > 100) {
      throw new CategoryDomainError('Category name must not exceed 100 characters');
    }
  }

  private static validateDescription(description: string | null): void {
    const cleanDesc = description?.trim() || '';
    if (cleanDesc.length > 500) {
      throw new CategoryDomainError('Description must not exceed 500 characters');
    }
  }

  public static create(
    id: string,
    code: string,
    name: string,
    description: string | null,
    now?: Date
  ): Category {
    Category.validateId(id);
    Category.validateCode(code);
    Category.validateName(name);
    Category.validateDescription(description);

    const timestamp = Category.resolveNow(now);

    return new Category({
      id,
      code: code.trim(),
      name: name.trim(),
      description: description?.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  public static rehydrate(props: CategoryProps): Category {
    Category.validateId(props.id);
    Category.validateCode(props.code);
    Category.validateName(props.name);
    Category.validateDescription(props.description);
    if (!props.createdAt || !props.updatedAt) {
      throw new CategoryDomainError('Missing required timestamps for category rehydration');
    }
    return new Category({
      id: props.id,
      code: props.code.trim(),
      name: props.name.trim(),
      description: props.description?.trim() || null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get code(): string {
    return this._code;
  }
  public get name(): string {
    return this._name;
  }
  public get description(): string | null {
    return this._description;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods
  public rename(newName: string, now?: Date): void {
    const cleanName = newName.trim();
    if (this._name === cleanName) return;
    Category.validateName(newName);
    this._name = cleanName;
    this._updatedAt = Category.resolveNow(now);
  }

  public changeDescription(newDescription: string | null, now?: Date): void {
    const cleanDesc = newDescription?.trim() || null;
    if (this._description === cleanDesc) return;
    Category.validateDescription(newDescription);
    this._description = cleanDesc;
    this._updatedAt = Category.resolveNow(now);
  }

  public touch(now?: Date): void {
    this._updatedAt = Category.resolveNow(now);
  }

  // Domain Comparison & Persistence helper
  public equals(other: Category): boolean {
    if (!(other instanceof Category)) return false;
    return this._id === other.id;
  }

  public toPersistence(): CategoryProps {
    return {
      id: this._id,
      code: this._code,
      name: this._name,
      description: this._description,
      createdAt: new Date(this._createdAt.getTime()),
      updatedAt: new Date(this._updatedAt.getTime()),
    };
  }
}
