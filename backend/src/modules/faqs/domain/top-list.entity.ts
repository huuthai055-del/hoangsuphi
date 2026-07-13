import { TopListItem, type TopListItemOwnerType, type TopListItemProps } from './top-list-item.entity';
import {
  TopListDomainError,
  DuplicateTopListItemError,
  InvalidTopListStateError,
  EmptyTopListError,
  ImmutableTopListError,
} from './faq.errors';

export type TopListStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface TopListProps {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  category: string | null;
  featured: boolean;
  status: TopListStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: TopListItem[];
}

export class TopList {
  private props: TopListProps;

  /**
   * Slug is set at creation and is IMMUTABLE thereafter.
   * Changing a slug breaks SEO links and external references.
   * If a slug must change, a redirect mechanism should be used instead.
   */
  private static readonly SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  /** Statuses from which archiving is allowed: DRAFT → ARCHIVED, PUBLISHED → ARCHIVED. */
  private static readonly ARCHIVABLE_STATUSES: TopListStatus[] = ['DRAFT', 'PUBLISHED'];

  private constructor(props: TopListProps) {
    this.props = props;
  }

  public static create(input: {
    id: string;
    title: string;
    description?: string | null;
    slug: string;
    category?: string | null;
    featured?: boolean;
    createdBy: string;
    now?: Date;
  }): TopList {
    const trimmedTitle = (input.title || '').trim();
    if (!trimmedTitle) {
      throw new TopListDomainError('TopList title cannot be empty');
    }

    const trimmedSlug = (input.slug || '').trim();
    if (!trimmedSlug) {
      throw new TopListDomainError('TopList slug cannot be empty');
    }
    // Slug must match URL-safe format: lowercase letters, digits, and hyphens.
    // Leading hyphens, trailing hyphens, and consecutive hyphens are not allowed.
    if (!TopList.SLUG_REGEX.test(trimmedSlug)) {
      throw new TopListDomainError(
        `TopList slug "${trimmedSlug}" is invalid. Use lowercase letters, digits, and single hyphens (e.g. best-100-places)`
      );
    }

    if (!input.createdBy || !input.createdBy.trim()) {
      throw new TopListDomainError('Created by user ID is required');
    }

    const now = input.now || new Date();
    return new TopList({
      id: input.id,
      title: trimmedTitle,
      description: input.description?.trim() || null,
      slug: trimmedSlug,
      category: input.category?.trim() || null,
      featured: input.featured ?? false,
      status: 'DRAFT',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      items: [],
    });
  }

  public static rehydrate(
    props: Omit<TopListProps, 'items'> & { items: TopListItemProps[] }
  ): TopList {
    return new TopList({
      ...props,
      items: props.items.map((item) => TopListItem.rehydrate(item)),
    });
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  public get id(): string { return this.props.id; }
  public get title(): string { return this.props.title; }
  public get description(): string | null { return this.props.description; }
  /** Slug is immutable — set once at creation and never changed. */
  public get slug(): string { return this.props.slug; }
  public get category(): string | null { return this.props.category; }
  public get featured(): boolean { return this.props.featured; }
  public get status(): TopListStatus { return this.props.status; }
  public get createdBy(): string { return this.props.createdBy; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }
  public get deletedAt(): Date | null { return this.props.deletedAt; }
  public get items(): TopListItem[] { return [...this.props.items]; }

  // ─── Guard ──────────────────────────────────────────────────────────────────

  private ensureMutable(): void {
    if (this.props.deletedAt) {
      throw new ImmutableTopListError('Cannot modify a deleted top list');
    }
    if (this.props.status === 'ARCHIVED') {
      throw new ImmutableTopListError('Cannot modify an archived top list');
    }
  }

  // ─── Domain Mutations ────────────────────────────────────────────────────────

  public update(
    input: {
      title?: string;
      description?: string | null;
      featured?: boolean;
    },
    now?: Date
  ): void {
    this.ensureMutable();

    let hasChanged = false;

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw new TopListDomainError('TopList title cannot be empty');
      }
      if (trimmed !== this.props.title) {
        this.props.title = trimmed;
        hasChanged = true;
      }
    }

    if (input.description !== undefined) {
      const normalized = input.description?.trim() || null;
      if (normalized !== this.props.description) {
        this.props.description = normalized;
        hasChanged = true;
      }
    }

    if (input.featured !== undefined && input.featured !== this.props.featured) {
      this.props.featured = input.featured;
      hasChanged = true;
    }

    if (hasChanged) {
      this.props.updatedAt = now || new Date();
    }
  }

  public addItem(
    input: {
      id: string;
      ownerType: TopListItemOwnerType;
      ownerId: string;
    },
    now?: Date
  ): TopListItem {
    this.ensureMutable();

    // Prevent duplicate (ownerType, ownerId) in same top list
    const duplicate = this.props.items.some(
      (item) => item.ownerType === input.ownerType && item.ownerId === input.ownerId
    );
    if (duplicate) {
      throw new DuplicateTopListItemError(
        `Item with ownerType ${input.ownerType} and ownerId ${input.ownerId} already exists in this top list`
      );
    }

    // Auto-increment displayOrder
    const nextOrder = this.props.items.length + 1;
    const updateTime = now || new Date();

    const newItem = TopListItem.create({
      id: input.id,
      topListId: this.id,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      displayOrder: nextOrder,
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
      throw new TopListDomainError(`Top list item not found with ID: ${itemId}`);
    }

    const updateTime = now || new Date();
    this.props.items.splice(index, 1);

    // Sort by current displayOrder before compacting to ensure
    // correct sequential numbering regardless of load/insert order
    this.props.items.sort((a, b) => a.displayOrder - b.displayOrder);

    let nextOrder = 1;
    for (const item of this.props.items) {
      if (item.displayOrder !== nextOrder) {
        item.updateOrder(nextOrder, updateTime);
      }
      nextOrder++;
    }

    this.props.updatedAt = updateTime;
  }

  public reorderItems(
    itemIdOrders: Array<{ id: string; displayOrder: number }>,
    now?: Date
  ): void {
    this.ensureMutable();

    // Must cover exactly all existing items
    if (itemIdOrders.length !== this.props.items.length) {
      throw new TopListDomainError('Reorder list must contain all items in the top list exactly');
    }

    // All IDs must exist
    const currentIds = new Set(this.props.items.map((i) => i.id));
    for (const order of itemIdOrders) {
      if (!currentIds.has(order.id)) {
        throw new TopListDomainError(`Item with ID ${order.id} does not belong to this top list`);
      }
    }

    // Display orders must be sequential starting from 1
    const sortedOrders = [...itemIdOrders].sort((a, b) => a.displayOrder - b.displayOrder);
    for (let i = 0; i < sortedOrders.length; i++) {
      const expected = i + 1;
      const order = sortedOrders[i];
      if (order && order.displayOrder !== expected) {
        throw new TopListDomainError(
          `Display order must be sequential starting from 1 (got ${order.displayOrder}, expected ${expected})`
        );
      }
    }

    const updateTime = now || new Date();

    // Build O(1) lookup Map to avoid O(n²) find() inside the loop
    const itemMap = new Map<string, TopListItem>(this.props.items.map((i) => [i.id, i]));
    for (const order of itemIdOrders) {
      itemMap.get(order.id)?.updateOrder(order.displayOrder, updateTime);
    }

    this.props.updatedAt = updateTime;
  }

  public publish(now?: Date): void {
    this.ensureMutable();

    if (this.props.status !== 'DRAFT') {
      throw new InvalidTopListStateError(`Cannot publish top list from status: ${this.props.status}`);
    }

    if (this.props.items.length === 0) {
      throw new EmptyTopListError('Cannot publish an empty top list');
    }

    const updateTime = now || new Date();
    this.props.status = 'PUBLISHED';
    this.props.updatedAt = updateTime;
  }

  public archive(now?: Date): void {
    if (this.props.deletedAt) {
      throw new ImmutableTopListError('Cannot archive a deleted top list');
    }

    // Explicit allowed transitions: DRAFT → ARCHIVED, PUBLISHED → ARCHIVED
    // ARCHIVED → ARCHIVED is not allowed
    if (!TopList.ARCHIVABLE_STATUSES.includes(this.props.status)) {
      throw new InvalidTopListStateError(
        `Cannot archive top list from status: ${this.props.status}. Allowed statuses: ${TopList.ARCHIVABLE_STATUSES.join(', ')}`
      );
    }

    const updateTime = now || new Date();
    this.props.status = 'ARCHIVED';
    this.props.updatedAt = updateTime;
  }

  public softDelete(now?: Date): void {
    // Idempotent: preserve the original deletedAt timestamp if already soft-deleted
    if (this.props.deletedAt) {
      return;
    }
    const updateTime = now || new Date();
    this.props.deletedAt = updateTime;
    this.props.updatedAt = updateTime;
  }

  public equals(other: TopList): boolean {
    return this.id === other.id;
  }

  public toPersistence(): Omit<TopListProps, 'items'> & { items: TopListItemProps[] } {
    return {
      ...this.props,
      items: this.props.items.map((item) => item.toPersistence()),
    };
  }
}
