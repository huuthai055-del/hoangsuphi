import { ArticleDomainError } from './article-errors';

export interface TagProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Tag {
  private _id: string;
  private _name: string;
  private _slug: string;
  private _description: string | null;
  private _isFeatured: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: TagProps) {
    this._id = props.id;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description;
    this._isFeatured = props.isFeatured;
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
      throw new ArticleDomainError('Tag ID is required');
    }
  }

  private static validateName(name: string): void {
    const cleanName = name?.trim();
    if (!cleanName || cleanName === '') {
      throw new ArticleDomainError('Tag name cannot be blank');
    }
    if (cleanName.length > 100) {
      throw new ArticleDomainError('Tag name must not exceed 100 characters');
    }
  }

  private static validateSlug(slug: string): void {
    if (!slug || slug.trim() === '') {
      throw new ArticleDomainError('Tag slug is required');
    }
    const cleanSlug = slug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      throw new ArticleDomainError('Tag slug must be a valid SEO slug format (lowercase alphanumeric and single dashes, no leading/trailing dashes)');
    }
  }

  public static create(
    id: string,
    name: string,
    slug: string,
    description: string | null,
    isFeatured = false,
    now?: Date
  ): Tag {
    Tag.validateId(id);
    Tag.validateName(name);
    Tag.validateSlug(slug);

    const timestamp = Tag.resolveNow(now);

    return new Tag({
      id,
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      isFeatured,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  public static rehydrate(props: TagProps): Tag {
    Tag.validateId(props.id);
    Tag.validateName(props.name);
    Tag.validateSlug(props.slug);
    if (!props.createdAt || !props.updatedAt) {
      throw new ArticleDomainError('Missing required timestamps for tag rehydration');
    }
    return new Tag({
      id: props.id,
      name: props.name.trim(),
      slug: props.slug.trim(),
      description: props.description?.trim() || null,
      isFeatured: props.isFeatured,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  // Getters
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get slug(): string { return this._slug; }
  public get description(): string | null { return this._description; }
  public get isFeatured(): boolean { return this._isFeatured; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  // Business Methods
  public rename(newName: string, now?: Date): void {
    Tag.validateName(newName);
    this._name = newName.trim();
    this._updatedAt = Tag.resolveNow(now);
  }

  public changeDescription(newDescription: string | null, now?: Date): void {
    this._description = newDescription?.trim() || null;
    this._updatedAt = Tag.resolveNow(now);
  }

  public feature(now?: Date): void {
    if (this._isFeatured) return;
    this._isFeatured = true;
    this._updatedAt = Tag.resolveNow(now);
  }

  public unfeature(now?: Date): void {
    if (!this._isFeatured) return;
    this._isFeatured = false;
    this._updatedAt = Tag.resolveNow(now);
  }

  public touch(now?: Date): void {
    this._updatedAt = Tag.resolveNow(now);
  }

  // Domain Comparison & Persistence helper
  public equals(other: Tag): boolean {
    if (!(other instanceof Tag)) return false;
    return this._id === other.id;
  }

  public toPersistence(): TagProps {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      description: this._description,
      isFeatured: this._isFeatured,
      createdAt: new Date(this._createdAt.getTime()),
      updatedAt: new Date(this._updatedAt.getTime()),
    };
  }
}
