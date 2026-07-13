import {
  ImmutableReviewError,
  InvalidReviewStateTransitionError,
} from './reviews.errors';
import { ReviewRating } from './review-rating.value-object';

export type OwnerType = 'PLACE' | 'BUSINESS' | 'ARTICLE' | 'ATTRACTION';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReviewProps {
  id: string;
  userId: string;
  ownerType: OwnerType;
  ownerId: string;
  rating: ReviewRating;
  title: string;
  content: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Review {
  private props: ReviewProps;

  private constructor(props: ReviewProps) {
    this.props = props;
  }

  public static create(props: {
    id: string;
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    rating: number;
    title: string;
    content: string;
    now?: Date;
  }): Review {
    const validOwnerTypes: OwnerType[] = ['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION'];
    if (!props.ownerType || !validOwnerTypes.includes(props.ownerType)) {
      throw new ImmutableReviewError('Invalid owner type');
    }
    if (!props.ownerId || !props.ownerId.trim()) {
      throw new ImmutableReviewError('Owner ID is required');
    }

    const trimmedTitle = (props.title || '').trim();
    const trimmedContent = (props.content || '').trim();

    if (!trimmedTitle) {
      throw new ImmutableReviewError('Review title cannot be empty');
    }
    if (!trimmedContent) {
      throw new ImmutableReviewError('Review content cannot be empty');
    }

    const now = props.now || new Date();

    return new Review({
      id: props.id,
      userId: props.userId,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      rating: ReviewRating.create(props.rating),
      title: trimmedTitle,
      content: trimmedContent,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  public static rehydrate(props: {
    id: string;
    userId: string;
    ownerType: OwnerType;
    ownerId: string;
    rating: number;
    title: string;
    content: string;
    status: ReviewStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  }): Review {
    const validOwnerTypes: OwnerType[] = ['PLACE', 'BUSINESS', 'ARTICLE', 'ATTRACTION'];
    if (!props.ownerType || !validOwnerTypes.includes(props.ownerType)) {
      throw new ImmutableReviewError('Invalid owner type');
    }
    if (!props.ownerId || !props.ownerId.trim()) {
      throw new ImmutableReviewError('Owner ID is required');
    }

    return new Review({
      ...props,
      rating: ReviewRating.create(props.rating),
    });
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
  public get rating(): number {
    return this.props.rating.getValue();
  }
  public get title(): string {
    return this.props.title;
  }
  public get content(): string {
    return this.props.content;
  }
  public get status(): ReviewStatus {
    return this.props.status;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
  public get deletedAt(): Date | null | undefined {
    return this.props.deletedAt;
  }

  // Guards
  private ensureNotDeleted(): void {
    if (this.props.deletedAt) {
      throw new ImmutableReviewError('Cannot modify a deleted review');
    }
  }

  private ensureNotApprovedOrRejected(): void {
    if (this.props.status === 'APPROVED') {
      throw new ImmutableReviewError('Cannot modify an approved review');
    }
    if (this.props.status === 'REJECTED') {
      throw new ImmutableReviewError('Cannot modify a rejected review');
    }
  }

  // State transitions
  public approve(now: Date = new Date()): void {
    this.ensureNotDeleted();
    if (this.props.status === 'REJECTED') {
      throw new InvalidReviewStateTransitionError('REJECTED', 'APPROVED');
    }
    if (this.props.status === 'APPROVED') return;

    this.props.status = 'APPROVED';
    this.props.updatedAt = now;
  }

  public reject(now: Date = new Date()): void {
    this.ensureNotDeleted();
    if (this.props.status === 'APPROVED') {
      throw new InvalidReviewStateTransitionError('APPROVED', 'REJECTED');
    }
    if (this.props.status === 'REJECTED') return;

    this.props.status = 'REJECTED';
    this.props.updatedAt = now;
  }

  public softDelete(now: Date = new Date()): void {
    this.ensureNotDeleted();
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  // Mutators
  public updateContent(props: {
    title: string;
    content: string;
    rating: number;
    now?: Date;
  }): void {
    this.ensureNotDeleted();
    this.ensureNotApprovedOrRejected();

    const trimmedTitle = (props.title || '').trim();
    const trimmedContent = (props.content || '').trim();

    if (!trimmedTitle) {
      throw new ImmutableReviewError('Review title cannot be empty');
    }
    if (!trimmedContent) {
      throw new ImmutableReviewError('Review content cannot be empty');
    }

    const newRating = ReviewRating.create(props.rating);
    
    // Check if anything actually changed
    const hasChanged =
      this.props.title !== trimmedTitle ||
      this.props.content !== trimmedContent ||
      !this.props.rating.equals(newRating);

    if (hasChanged) {
      this.props.title = trimmedTitle;
      this.props.content = trimmedContent;
      this.props.rating = newRating;
      this.props.updatedAt = props.now || new Date();
    }
  }

  public toPersistence() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      ownerType: this.props.ownerType,
      ownerId: this.props.ownerId,
      rating: this.props.rating.getValue(),
      title: this.props.title,
      content: this.props.content,
      status: this.props.status,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      deletedAt: this.props.deletedAt,
    };
  }

  public equals(other: Review): boolean {
    return this.id === other.id;
  }
}
