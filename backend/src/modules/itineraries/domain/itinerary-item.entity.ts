import { ItineraryDomainError } from './itinerary.errors';

export type ItineraryItemOwnerType = 'PLACE' | 'BUSINESS' | 'ATTRACTION';

export interface ItineraryItemProps {
  id: string;
  itineraryId: string;
  ownerType: ItineraryItemOwnerType;
  ownerId: string;
  dayNumber: number;
  displayOrder: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ItineraryItem {
  private props: ItineraryItemProps;

  private constructor(props: ItineraryItemProps) {
    this.props = props;
  }

  private static validate(dayNumber: number, displayOrder: number) {
    if (dayNumber < 1 || dayNumber > 365) {
      throw new ItineraryDomainError('Day number must be between 1 and 365');
    }
    if (displayOrder < 1) {
      throw new ItineraryDomainError('Display order must be at least 1');
    }
  }

  public static create(props: {
    id: string;
    itineraryId: string;
    ownerType: ItineraryItemOwnerType;
    ownerId: string;
    dayNumber: number;
    displayOrder: number;
    note?: string | null;
    now?: Date;
  }): ItineraryItem {
    if (!props.itineraryId || !props.itineraryId.trim()) {
      throw new ItineraryDomainError('Itinerary ID is required');
    }
    if (!props.ownerId || !props.ownerId.trim()) {
      throw new ItineraryDomainError('Owner ID is required');
    }
    
    ItineraryItem.validate(props.dayNumber, props.displayOrder);

    const validOwnerTypes: ItineraryItemOwnerType[] = ['PLACE', 'BUSINESS', 'ATTRACTION'];
    if (!props.ownerType || !validOwnerTypes.includes(props.ownerType)) {
      throw new ItineraryDomainError(`Invalid itinerary item owner type: ${props.ownerType}`);
    }

    const now = props.now || new Date();

    return new ItineraryItem({
      id: props.id,
      itineraryId: props.itineraryId,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      dayNumber: props.dayNumber,
      displayOrder: props.displayOrder,
      note: props.note ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: ItineraryItemProps): ItineraryItem {
    ItineraryItem.validate(props.dayNumber, props.displayOrder);
    return new ItineraryItem({ ...props });
  }

  // Getters
  public get id(): string {
    return this.props.id;
  }
  public get itineraryId(): string {
    return this.props.itineraryId;
  }
  public get ownerType(): ItineraryItemOwnerType {
    return this.props.ownerType;
  }
  public get ownerId(): string {
    return this.props.ownerId;
  }
  public get dayNumber(): number {
    return this.props.dayNumber;
  }
  public get displayOrder(): number {
    return this.props.displayOrder;
  }
  public get note(): string | null {
    return this.props.note;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Domain Actions
  public updateOrder(dayNumber: number, displayOrder: number, now?: Date): void {
    ItineraryItem.validate(dayNumber, displayOrder);
    this.props.dayNumber = dayNumber;
    this.props.displayOrder = displayOrder;
    this.props.updatedAt = now || new Date();
  }

  public updateNote(note: string | null, now?: Date): void {
    this.props.note = note;
    this.props.updatedAt = now || new Date();
  }

  public equals(other: ItineraryItem): boolean {
    return this.id === other.id;
  }

  public toPersistence(): ItineraryItemProps {
    return { ...this.props };
  }
}
