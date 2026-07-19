import { FaqDomainError, ImmutableFaqError, InvalidFaqStateError } from './faq.errors';

export type FaqStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface FaqProps {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  status: FaqStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Faq {
  private props: FaqProps;

  private constructor(props: FaqProps) {
    this.props = props;
  }

  public static create(input: {
    id: string;
    question: string;
    answer: string;
    category?: string | null;
    displayOrder?: number;
    createdBy: string;
    now?: Date;
  }): Faq {
    const trimmedQuestion = (input.question || '').trim();
    if (!trimmedQuestion) {
      throw new FaqDomainError('FAQ question cannot be empty');
    }

    const trimmedAnswer = (input.answer || '').trim();
    if (!trimmedAnswer) {
      throw new FaqDomainError('FAQ answer cannot be empty');
    }

    if (!input.createdBy || !input.createdBy.trim()) {
      throw new FaqDomainError('Created by user ID is required');
    }

    const displayOrder = input.displayOrder ?? 1;
    if (displayOrder < 1) {
      throw new FaqDomainError('Display order must be at least 1');
    }

    const now = input.now || new Date();

    return new Faq({
      id: input.id,
      question: trimmedQuestion,
      answer: trimmedAnswer,
      category: input.category?.trim() || null,
      displayOrder,
      status: 'DRAFT',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  public static rehydrate(props: FaqProps): Faq {
    return new Faq({ ...props });
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  public get id(): string {
    return this.props.id;
  }
  public get question(): string {
    return this.props.question;
  }
  public get answer(): string {
    return this.props.answer;
  }
  public get category(): string | null {
    return this.props.category;
  }
  public get displayOrder(): number {
    return this.props.displayOrder;
  }
  public get status(): FaqStatus {
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

  // ─── Guard ──────────────────────────────────────────────────────────────────

  private ensureMutable(): void {
    if (this.props.deletedAt) {
      throw new ImmutableFaqError('Cannot modify a deleted FAQ');
    }
    if (this.props.status === 'ARCHIVED') {
      throw new ImmutableFaqError('Cannot modify an archived FAQ');
    }
  }

  // ─── Domain Mutations ────────────────────────────────────────────────────────

  public update(
    input: {
      question?: string;
      answer?: string;
      category?: string | null;
      displayOrder?: number;
    },
    now?: Date
  ): void {
    this.ensureMutable();

    if (input.question !== undefined) {
      const trimmed = input.question.trim();
      if (!trimmed) {
        throw new FaqDomainError('FAQ question cannot be empty');
      }
      this.props.question = trimmed;
    }

    if (input.answer !== undefined) {
      const trimmed = input.answer.trim();
      if (!trimmed) {
        throw new FaqDomainError('FAQ answer cannot be empty');
      }
      this.props.answer = trimmed;
    }

    if (input.category !== undefined) {
      this.props.category = input.category?.trim() || null;
    }

    if (input.displayOrder !== undefined) {
      if (input.displayOrder < 1) {
        throw new FaqDomainError('Display order must be at least 1');
      }
      this.props.displayOrder = input.displayOrder;
    }

    this.props.updatedAt = now || new Date();
  }

  public publish(now?: Date): void {
    this.ensureMutable();

    if (this.props.status !== 'DRAFT') {
      throw new InvalidFaqStateError(`Cannot publish FAQ from status: ${this.props.status}`);
    }

    const updateTime = now || new Date();
    this.props.status = 'PUBLISHED';
    this.props.updatedAt = updateTime;
  }

  public archive(now?: Date): void {
    if (this.props.deletedAt) {
      throw new ImmutableFaqError('Cannot archive a deleted FAQ');
    }
    if (this.props.status === 'ARCHIVED') {
      throw new InvalidFaqStateError('FAQ is already archived');
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

  public equals(other: Faq): boolean {
    return this.id === other.id;
  }

  public toPersistence(): FaqProps {
    return { ...this.props };
  }
}
