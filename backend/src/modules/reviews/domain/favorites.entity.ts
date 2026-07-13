import { FavoriteDomainError } from './reviews.errors';
import type { OwnerType } from './reviews.entity';

export interface FavoriteProps {
  id: string;
  userId: string;
  ownerType: OwnerType;
  ownerId: string;
  createdAt: Date;
}

export class Favorite {
  private props: FavoriteProps;

  private constructor(props: FavoriteProps) {
    this.props = props;
  }

  public static create(props: {
    id: string;
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    now?: Date;
  }): Favorite {
    if (!props.userId || !props.userId.trim()) {
      throw new FavoriteDomainError('User ID is required');
    }
    if (!props.ownerId || !props.ownerId.trim()) {
      throw new FavoriteDomainError('Owner ID is required');
    }
    
    const validOwnerTypes: OwnerType[] = ['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION'];
    if (!validOwnerTypes.includes(props.ownerType)) {
      throw new FavoriteDomainError(`Invalid owner type: ${props.ownerType}`);
    }

    const now = props.now || new Date();

    return new Favorite({
      id: props.id,
      userId: props.userId,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      createdAt: now,
    });
  }

  public static rehydrate(props: FavoriteProps): Favorite {
    if (!props.userId || !props.userId.trim()) {
      throw new FavoriteDomainError('User ID is required');
    }
    if (!props.ownerId || !props.ownerId.trim()) {
      throw new FavoriteDomainError('Owner ID is required');
    }
    
    const validOwnerTypes: OwnerType[] = ['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION'];
    if (!validOwnerTypes.includes(props.ownerType)) {
      throw new FavoriteDomainError(`Invalid owner type: ${props.ownerType}`);
    }

    return new Favorite(props);
  }

  // Getters
  public get id(): string {
    return this.props.id;
  }
  public get userId(): string {
    return this.props.userId;
  }
  public get ownerType(): OwnerType {
    return this.props.ownerType;
  }
  public get ownerId(): string {
    return this.props.ownerId;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public toPersistence(): FavoriteProps {
    return {
      id: this.props.id,
      userId: this.props.userId,
      ownerType: this.props.ownerType,
      ownerId: this.props.ownerId,
      createdAt: this.props.createdAt,
    };
  }

  public equals(other: Favorite): boolean {
    return this.id === other.id;
  }
}
