import {
  ItineraryItem,
  type ItineraryItemOwnerType,
  type ItineraryItemProps,
} from './itinerary-item.entity';
import {
  DuplicateItineraryItemError,
  EmptyItineraryError,
  ImmutableItineraryError,
  InvalidItineraryStateError,
  ItineraryDomainError,
} from './itinerary.errors';

export type ItineraryVisibility = 'PUBLIC' | 'PRIVATE';
export type ItineraryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ItineraryProps {
  id: string;
  title: string;
  description: string | null;
  visibility: ItineraryVisibility;
  status: ItineraryStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: ItineraryItem[];
}

export class Itinerary {
  private props: ItineraryProps;

  private constructor(props: ItineraryProps) {
    this.props = props;
  }

  public static create(props: {
    id: string;
    title: string;
    description?: string | null;
    visibility?: ItineraryVisibility;
    createdBy: string;
    now?: Date;
  }): Itinerary {
    const trimmedTitle = (props.title || '').trim();
    if (!trimmedTitle) {
      throw new ItineraryDomainError('Itinerary title cannot be empty');
    }
    if (!props.createdBy || !props.createdBy.trim()) {
      throw new ItineraryDomainError('Created by user ID is required');
    }

    const now = props.now || new Date();

    return new Itinerary({
      id: props.id,
      title: trimmedTitle,
      description: props.description?.trim() || null,
      visibility: props.visibility || 'PRIVATE',
      status: 'DRAFT',
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      items: [],
    });
  }

  public static rehydrate(
    props: Omit<ItineraryProps, 'items'> & { items: ItineraryItemProps[] }
  ): Itinerary {
    return new Itinerary({
      ...props,
      items: props.items.map((itemProps) => ItineraryItem.rehydrate(itemProps)),
    });
  }

  // Getters
  public get id(): string {
    return this.props.id;
  }
  public get title(): string {
    return this.props.title;
  }
  public get description(): string | null {
    return this.props.description;
  }
  public get visibility(): ItineraryVisibility {
    return this.props.visibility;
  }
  public get status(): ItineraryStatus {
    return this.props.status;
  }
  public get createdBy(): string {
    return this.props.createdBy;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  public get items(): ItineraryItem[] {
    return [...this.props.items];
  }

  // Helper validation
  private ensureMutable(): void {
    if (this.props.deletedAt) {
      throw new ImmutableItineraryError('Cannot modify a deleted itinerary');
    }
    if (this.props.status === 'ARCHIVED') {
      throw new ImmutableItineraryError('Cannot modify an archived itinerary');
    }
  }

  // Domain Mutations
  public updateInfo(
    props: {
      title?: string;
      description?: string | null;
      visibility?: ItineraryVisibility;
    },
    now?: Date
  ): void {
    this.ensureMutable();

    if (props.title !== undefined) {
      const trimmedTitle = props.title.trim();
      if (!trimmedTitle) {
        throw new ItineraryDomainError('Itinerary title cannot be empty');
      }
      this.props.title = trimmedTitle;
    }

    if (props.description !== undefined) {
      this.props.description = props.description?.trim() || null;
    }

    if (props.visibility !== undefined) {
      this.props.visibility = props.visibility;
    }

    this.props.updatedAt = now || new Date();
  }

  public addItem(
    props: {
      id: string;
      ownerType: ItineraryItemOwnerType;
      ownerId: string;
      dayNumber: number;
      note?: string | null;
    },
    now?: Date
  ): ItineraryItem {
    this.ensureMutable();

    if (props.dayNumber < 1 || props.dayNumber > 365) {
      throw new ItineraryDomainError('Day number must be between 1 and 365');
    }

    // Check duplicate ownerType and ownerId in this itinerary
    const duplicate = this.props.items.some(
      (item) => item.ownerType === props.ownerType && item.ownerId === props.ownerId
    );
    if (duplicate) {
      throw new DuplicateItineraryItemError(
        `Itinerary item with ownerType ${props.ownerType} and ownerId ${props.ownerId} already exists in this itinerary`
      );
    }

    // Determine automatic displayOrder (max displayOrder in this dayNumber + 1)
    const itemsInDay = this.props.items.filter((item) => item.dayNumber === props.dayNumber);
    const maxOrder =
      itemsInDay.length > 0 ? Math.max(...itemsInDay.map((item) => item.displayOrder)) : 0;
    const nextOrder = maxOrder + 1;

    const updateTime = now || new Date();

    const newItem = ItineraryItem.create({
      id: props.id,
      itineraryId: this.id,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      dayNumber: props.dayNumber,
      displayOrder: nextOrder,
      note: props.note,
      now: updateTime,
    });

    this.props.items.push(newItem);
    this.props.updatedAt = updateTime;

    return newItem;
  }

  public removeItem(itemId: string, now?: Date): void {
    this.ensureMutable();

    const index = this.props.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new ItineraryDomainError(`Itinerary item not found with ID: ${itemId}`);
    }

    const removedItem = this.props.items[index];
    if (!removedItem) {
      throw new ItineraryDomainError(`Itinerary item not found with ID: ${itemId}`);
    }
    const updateTime = now || new Date();

    // Remove the item
    this.props.items.splice(index, 1);

    // Reorder displayOrder of remaining items in that dayNumber to ensure sequence continuity
    this.reorderDayNumberItems(removedItem.dayNumber, updateTime);

    this.props.updatedAt = updateTime;
  }

  private reorderDayNumberItems(dayNumber: number, now: Date): void {
    const dayItems = this.props.items
      .filter((item) => item.dayNumber === dayNumber)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    let nextOrder = 1;
    for (const item of dayItems) {
      if (item.displayOrder !== nextOrder) {
        item.updateOrder(dayNumber, nextOrder, now);
      }
      nextOrder++;
    }
  }

  public reorderItems(
    itemIdOrders: Array<{ id: string; dayNumber: number; displayOrder: number }>,
    now?: Date
  ): void {
    this.ensureMutable();

    // 1. Reorder list must cover exactly all existing items
    if (itemIdOrders.length !== this.props.items.length) {
      throw new ItineraryDomainError(
        'Reorder list must contain all items in the itinerary exactly'
      );
    }

    // 2. Check if all IDs exist in the itinerary
    const currentItemIds = new Set(this.props.items.map((i) => i.id));
    for (const order of itemIdOrders) {
      if (!currentItemIds.has(order.id)) {
        throw new ItineraryDomainError(
          `Item with ID ${order.id} does not belong to this itinerary`
        );
      }
    }

    // 3. Group by dayNumber to validate displayOrder continuity
    const groups: Record<number, Array<{ id: string; displayOrder: number }>> = {};
    for (const order of itemIdOrders) {
      if (order.dayNumber < 1 || order.dayNumber > 365) {
        throw new ItineraryDomainError('Day number must be between 1 and 365');
      }
      if (order.displayOrder < 1) {
        throw new ItineraryDomainError('Display order must be at least 1');
      }
      const dayGroup = groups[order.dayNumber] ?? [];
      dayGroup.push(order);
      groups[order.dayNumber] = dayGroup;
    }

    for (const dayStr of Object.keys(groups)) {
      const dayNum = Number(dayStr);
      const ordersInDay = groups[dayNum];
      if (!ordersInDay) continue;
      ordersInDay.sort((a, b) => a.displayOrder - b.displayOrder);

      let expectedOrder = 1;
      for (const order of ordersInDay) {
        if (order.displayOrder !== expectedOrder) {
          throw new ItineraryDomainError(
            `Display order in day ${dayNum} must be sequential starting from 1 (got ${order.displayOrder}, expected ${expectedOrder})`
          );
        }
        expectedOrder++;
      }
    }

    // 4. Apply reorder updates
    const updateTime = now || new Date();
    for (const order of itemIdOrders) {
      const item = this.props.items.find((i) => i.id === order.id);
      if (item) {
        item.updateOrder(order.dayNumber, order.displayOrder, updateTime);
      }
    }

    this.props.updatedAt = updateTime;
  }

  public publish(now?: Date): void {
    this.ensureMutable();

    if (this.props.status !== 'DRAFT') {
      throw new InvalidItineraryStateError(
        `Cannot publish itinerary from status: ${this.props.status}`
      );
    }

    if (this.props.items.length === 0) {
      throw new EmptyItineraryError('Cannot publish an empty itinerary');
    }

    const updateTime = now || new Date();
    this.props.status = 'PUBLISHED';
    this.props.updatedAt = updateTime;
  }

  public archive(now?: Date): void {
    if (this.props.deletedAt) {
      throw new ImmutableItineraryError('Cannot archive a deleted itinerary');
    }
    if (this.props.status === 'ARCHIVED') {
      throw new InvalidItineraryStateError('Itinerary is already archived');
    }

    const updateTime = now || new Date();
    this.props.status = 'ARCHIVED';
    this.props.updatedAt = updateTime;
  }

  public softDelete(now?: Date): void {
    const updateTime = now || new Date();
    this.props.deletedAt = updateTime;
    this.props.updatedAt = updateTime;
  }

  public equals(other: Itinerary): boolean {
    return this.id === other.id;
  }

  public toPersistence(): Omit<ItineraryProps, 'items'> & { items: ItineraryItemProps[] } {
    return {
      ...this.props,
      items: this.props.items.map((item) => item.toPersistence()),
    };
  }
}
