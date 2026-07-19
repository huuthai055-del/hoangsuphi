import { TopListDomainError } from './faq.errors';

export type TopListItemOwnerType = 'PLACE' | 'BUSINESS' | 'ATTRACTION';

export interface TopListItemProps {
  id: string;
  topListId: string;
  ownerType: TopListItemOwnerType;
  ownerId: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TopListItem {
  private props: TopListItemProps;

  private constructor(props: TopListItemProps) {
    this.props = props;
  }

  private static validate(displayOrder: number): void {
    if (displayOrder < 1) {
      throw new TopListDomainError('Display order must be at least 1');
    }
  }

  public static create(input: {
    id: string;
    topListId: string;
    ownerType: TopListItemOwnerType;
    ownerId: string;
    displayOrder: number;
    now?: Date;
  }): TopListItem {
    if (!input.topListId || !input.topListId.trim()) {
      throw new TopListDomainError('TopList ID is required');
    }
    if (!input.ownerId || !input.ownerId.trim()) {
      throw new TopListDomainError('Owner ID is required');
    }

    const validOwnerTypes: TopListItemOwnerType[] = ['PLACE', 'BUSINESS', 'ATTRACTION'];
    if (!validOwnerTypes.includes(input.ownerType)) {
      throw new TopListDomainError(`Invalid owner type: ${input.ownerType}`);
    }

    TopListItem.validate(input.displayOrder);

    const now = input.now || new Date();
    return new TopListItem({
      id: input.id,
      topListId: input.topListId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      displayOrder: input.displayOrder,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: TopListItemProps): TopListItem {
    TopListItem.validate(props.displayOrder);
    return new TopListItem({ ...props });
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  public get id(): string {
    return this.props.id;
  }
  public get topListId(): string {
    return this.props.topListId;
  }
  public get ownerType(): TopListItemOwnerType {
    return this.props.ownerType;
  }
  public get ownerId(): string {
    return this.props.ownerId;
  }
  public get displayOrder(): number {
    return this.props.displayOrder;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  public updateOrder(displayOrder: number, now: Date): void {
    TopListItem.validate(displayOrder);
    this.props.displayOrder = displayOrder;
    this.props.updatedAt = now;
  }

  public equals(other: TopListItem): boolean {
    return this.id === other.id;
  }

  public toPersistence(): TopListItemProps {
    return { ...this.props };
  }
}
