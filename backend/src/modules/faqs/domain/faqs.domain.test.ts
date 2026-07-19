import { describe, expect, test } from 'bun:test';
import { Faq } from './faq.entity';
import {
  DuplicateTopListItemError,
  EmptyTopListError,
  FaqDomainError,
  ImmutableFaqError,
  ImmutableTopListError,
  InvalidFaqStateError,
  InvalidTopListStateError,
  TopListDomainError,
} from './faq.errors';
import { TopListItem } from './top-list-item.entity';
import { TopList } from './top-list.entity';

// ─── FAQ Entity Tests ─────────────────────────────────────────────────────────

describe('Faq Domain Entity', () => {
  test('should create FAQ with DRAFT status and correct values', () => {
    const faq = Faq.create({
      id: 'faq-01',
      question: '  What is HoangSuPhi?  ',
      answer: '  It is a tourism platform.  ',
      category: 'general',
      displayOrder: 1,
      createdBy: 'user-01',
    });

    expect(faq.question).toBe('What is HoangSuPhi?');
    expect(faq.answer).toBe('It is a tourism platform.');
    expect(faq.status).toBe('DRAFT');
    expect(faq.displayOrder).toBe(1);
    expect(faq.deletedAt).toBeNull();
  });

  test('should throw FaqDomainError if question is empty', () => {
    expect(() =>
      Faq.create({ id: 'faq-01', question: '', answer: 'Some answer', createdBy: 'user-01' })
    ).toThrow(FaqDomainError);
  });

  test('should throw FaqDomainError if answer is empty', () => {
    expect(() =>
      Faq.create({ id: 'faq-01', question: 'Q?', answer: '   ', createdBy: 'user-01' })
    ).toThrow(FaqDomainError);
  });

  test('should throw FaqDomainError if displayOrder < 1', () => {
    expect(() =>
      Faq.create({
        id: 'faq-01',
        question: 'Q?',
        answer: 'A',
        displayOrder: 0,
        createdBy: 'user-01',
      })
    ).toThrow(FaqDomainError);
  });

  test('should update FAQ fields successfully', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });

    faq.update({ question: 'New Q?', answer: 'New A', category: 'tourism', displayOrder: 3 });

    expect(faq.question).toBe('New Q?');
    expect(faq.answer).toBe('New A');
    expect(faq.category).toBe('tourism');
    expect(faq.displayOrder).toBe(3);
  });

  test('should throw FaqDomainError when updating with empty question', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    expect(() => faq.update({ question: '' })).toThrow(FaqDomainError);
  });

  test('should publish FAQ from DRAFT status successfully', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.publish();
    expect(faq.status).toBe('PUBLISHED');
  });

  test('should throw InvalidFaqStateError if publishing non-DRAFT FAQ', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.publish();
    expect(() => faq.publish()).toThrow(InvalidFaqStateError);
  });

  test('should archive DRAFT or PUBLISHED FAQ successfully', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.archive();
    expect(faq.status).toBe('ARCHIVED');
  });

  test('should throw InvalidFaqStateError if archiving already archived FAQ', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.archive();
    expect(() => faq.archive()).toThrow(InvalidFaqStateError);
  });

  test('should throw ImmutableFaqError when modifying archived FAQ', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.archive();
    expect(() => faq.update({ question: 'Updated?' })).toThrow(ImmutableFaqError);
    expect(() => faq.publish()).toThrow(ImmutableFaqError);
  });

  test('should soft delete FAQ and block mutations', () => {
    const faq = Faq.create({ id: 'faq-01', question: 'Q?', answer: 'A', createdBy: 'user-01' });
    faq.softDelete();

    expect(faq.deletedAt).not.toBeNull();
    expect(() => faq.update({ question: 'New?' })).toThrow(ImmutableFaqError);
    expect(() => faq.publish()).toThrow(ImmutableFaqError);
  });

  test('should support equality comparison', () => {
    const faqA = Faq.rehydrate({
      id: 'faq-01',
      question: 'Q?',
      answer: 'A',
      category: null,
      displayOrder: 1,
      status: 'DRAFT',
      createdBy: 'user-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const faqB = Faq.rehydrate({
      id: 'faq-01',
      question: 'Other?',
      answer: 'Other A',
      category: null,
      displayOrder: 2,
      status: 'PUBLISHED',
      createdBy: 'user-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    expect(faqA.equals(faqB)).toBe(true);
  });
});

// ─── TopListItem Entity Tests ─────────────────────────────────────────────────

describe('TopListItem Domain Entity', () => {
  test('should create TopListItem with valid inputs', () => {
    const item = TopListItem.create({
      id: 'item-01',
      topListId: 'list-01',
      ownerType: 'PLACE',
      ownerId: 'place-01',
      displayOrder: 1,
    });

    expect(item.id).toBe('item-01');
    expect(item.displayOrder).toBe(1);
    expect(item.ownerType).toBe('PLACE');
  });

  test('should throw TopListDomainError if displayOrder < 1', () => {
    expect(() =>
      TopListItem.create({
        id: 'item-01',
        topListId: 'list-01',
        ownerType: 'PLACE',
        ownerId: 'place-01',
        displayOrder: 0,
      })
    ).toThrow(TopListDomainError);
  });

  test('should throw TopListDomainError for invalid ownerType', () => {
    expect(() =>
      TopListItem.create({
        id: 'item-01',
        topListId: 'list-01',
        ownerType: 'HOTEL' as any,
        ownerId: 'h-01',
        displayOrder: 1,
      })
    ).toThrow(TopListDomainError);
  });

  test('should support equality comparison by ID', () => {
    const a = TopListItem.rehydrate({
      id: 'item-01',
      topListId: 'list-01',
      ownerType: 'PLACE',
      ownerId: 'p1',
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const b = TopListItem.rehydrate({
      id: 'item-01',
      topListId: 'list-01',
      ownerType: 'BUSINESS',
      ownerId: 'b1',
      displayOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(a.equals(b)).toBe(true);
  });
});

// ─── TopList Aggregate Tests ──────────────────────────────────────────────────

describe('TopList Aggregate Root Domain Entity', () => {
  test('should create TopList with DRAFT status', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Best Places in Hanoi',
      slug: 'best-places-hanoi',
      createdBy: 'user-01',
    });

    expect(list.title).toBe('Best Places in Hanoi');
    expect(list.slug).toBe('best-places-hanoi');
    expect(list.status).toBe('DRAFT');
    expect(list.featured).toBe(false);
    expect(list.items.length).toBe(0);
  });

  test('should throw TopListDomainError if title is empty', () => {
    expect(() =>
      TopList.create({ id: 'list-01', title: '', slug: 'some-slug', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
  });

  test('should throw TopListDomainError if slug is empty', () => {
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Some Title', slug: '   ', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
  });

  test('should throw TopListDomainError if slug has invalid format', () => {
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Title', slug: 'Xin Chào!!!', createdBy: 'user-01' })
    ).toThrow('invalid');
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Title', slug: 'UPPERCASE', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
  });

  test('should throw TopListDomainError for slugs with leading, trailing or consecutive hyphens', () => {
    // Leading hyphen
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Title', slug: '-leading', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
    // Trailing hyphen
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Title', slug: 'trailing-', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
    // Consecutive hyphens
    expect(() =>
      TopList.create({
        id: 'list-01',
        title: 'Title',
        slug: 'double--hyphen',
        createdBy: 'user-01',
      })
    ).toThrow(TopListDomainError);
    // Only hyphens
    expect(() =>
      TopList.create({ id: 'list-01', title: 'Title', slug: '---', createdBy: 'user-01' })
    ).toThrow(TopListDomainError);
  });

  test('should accept valid slug with lowercase letters, digits, and hyphens', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'best-100-places',
      createdBy: 'user-01',
    });
    expect(list.slug).toBe('best-100-places');
  });

  test('should update title, description, and featured', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });

    list.update({ title: 'New Title', description: 'A great list', featured: true });

    expect(list.title).toBe('New Title');
    expect(list.description).toBe('A great list');
    expect(list.featured).toBe(true);
  });

  test('should NOT update updatedAt when update() receives identical data (hasChanged guard)', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    const originalUpdatedAt = list.updatedAt;

    // Pass exactly the same value — nothing changes
    list.update({ title: 'Title', featured: false });

    expect(list.updatedAt).toEqual(originalUpdatedAt);
  });

  test('should update updatedAt only when data actually changes', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
      now,
    });
    const originalUpdatedAt = list.updatedAt;

    const later = new Date('2025-06-01T00:00:00Z');
    list.update({ title: 'Changed Title' }, later);

    expect(list.title).toBe('Changed Title');
    expect(list.updatedAt).toEqual(later);
    expect(list.updatedAt).not.toEqual(originalUpdatedAt);
  });

  test('should add items and auto-increment displayOrder', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });

    const item1 = list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    const item2 = list.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b1' });

    expect(item1.displayOrder).toBe(1);
    expect(item2.displayOrder).toBe(2);
    expect(list.items.length).toBe(2);
  });

  test('should throw DuplicateTopListItemError on duplicate ownerType+ownerId', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });

    expect(() => list.addItem({ id: 'item-2', ownerType: 'PLACE', ownerId: 'p1' })).toThrow(
      DuplicateTopListItemError
    );
  });

  test('should remove item and compact displayOrder', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    const item2 = list.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b1' });
    list.addItem({ id: 'item-3', ownerType: 'ATTRACTION', ownerId: 'a1' });

    list.removeItem(item2.id);

    expect(list.items.length).toBe(2);
    const remaining = list.items;
    expect(remaining.find((i) => i.id === 'item-1')?.displayOrder).toBe(1);
    expect(remaining.find((i) => i.id === 'item-3')?.displayOrder).toBe(2);
  });

  test('should compact displayOrder correctly when internal array is out of natural order', () => {
    // Simulate a scenario where items may be in unexpected order after rehydration
    const list = TopList.rehydrate({
      id: 'list-01',
      title: 'Title',
      description: null,
      slug: 'slug',
      category: null,
      featured: false,
      status: 'DRAFT',
      createdBy: 'user-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      items: [
        // Intentionally out of order: displayOrder 3 before 1
        {
          id: 'item-3',
          topListId: 'list-01',
          ownerType: 'ATTRACTION',
          ownerId: 'a1',
          displayOrder: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'item-1',
          topListId: 'list-01',
          ownerType: 'PLACE',
          ownerId: 'p1',
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'item-2',
          topListId: 'list-01',
          ownerType: 'BUSINESS',
          ownerId: 'b1',
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    // Remove item-1 (displayOrder 1)
    list.removeItem('item-1');

    expect(list.items.length).toBe(2);
    // After sort-before-compact, remaining items are sorted by displayOrder first
    expect(list.items.find((i) => i.id === 'item-2')?.displayOrder).toBe(1);
    expect(list.items.find((i) => i.id === 'item-3')?.displayOrder).toBe(2);
  });

  test('should reorder items validating sequential continuity', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    list.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b1' });

    list.reorderItems([
      { id: 'item-1', displayOrder: 2 },
      { id: 'item-2', displayOrder: 1 },
    ]);

    expect(list.items.find((i) => i.id === 'item-1')?.displayOrder).toBe(2);
    expect(list.items.find((i) => i.id === 'item-2')?.displayOrder).toBe(1);
  });

  test('should throw TopListDomainError if reorder list is incomplete', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    list.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b1' });

    expect(() => list.reorderItems([{ id: 'item-1', displayOrder: 1 }])).toThrow(
      'Reorder list must contain all items in the top list exactly'
    );
  });

  test('should throw TopListDomainError if reorder display order is non-sequential', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    list.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b1' });

    expect(() =>
      list.reorderItems([
        { id: 'item-1', displayOrder: 1 },
        { id: 'item-2', displayOrder: 3 },
      ])
    ).toThrow('Display order must be sequential starting from 1');
  });

  test('should throw EmptyTopListError if publishing empty top list', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    expect(() => list.publish()).toThrow(EmptyTopListError);
  });

  test('should publish top list with items successfully', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    list.publish();
    expect(list.status).toBe('PUBLISHED');
  });

  test('should throw InvalidTopListStateError if publishing non-DRAFT top list', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1' });
    list.publish();
    expect(() => list.publish()).toThrow(InvalidTopListStateError);
  });

  test('should archive top list from DRAFT or PUBLISHED', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.archive();
    expect(list.status).toBe('ARCHIVED');
  });

  test('should throw InvalidTopListStateError if already archived (explicit transition message)', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.archive();
    let err: unknown;
    try {
      list.archive();
    } catch (caught) {
      err = caught;
    }
    if (!(err instanceof Error)) throw new Error('Expected archive to throw');
    expect(err).toBeInstanceOf(InvalidTopListStateError);
    expect(err.message).toContain('DRAFT');
    expect(err.message).toContain('PUBLISHED');
  });

  test('should soft delete top list and block all mutations', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.softDelete();

    expect(list.deletedAt).not.toBeNull();
    expect(() => list.update({ title: 'New' })).toThrow(ImmutableTopListError);
    expect(() => list.addItem({ id: 'i1', ownerType: 'PLACE', ownerId: 'p1' })).toThrow(
      ImmutableTopListError
    );
    expect(() => list.publish()).toThrow(ImmutableTopListError);
  });

  test('should be idempotent: calling softDelete() twice preserves the original deletedAt', () => {
    const now1 = new Date('2025-01-01T00:00:00Z');
    const now2 = new Date('2025-06-01T00:00:00Z');
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });

    list.softDelete(now1);
    const firstDeletedAt = list.deletedAt;

    // Second call must be a no-op
    list.softDelete(now2);

    expect(list.deletedAt).toEqual(firstDeletedAt); // preserved, not overwritten
    expect(list.deletedAt).not.toEqual(now2);
  });

  test('should throw ImmutableTopListError when modifying archived top list', () => {
    const list = TopList.create({
      id: 'list-01',
      title: 'Title',
      slug: 'slug',
      createdBy: 'user-01',
    });
    list.archive();
    expect(() => list.update({ title: 'New' })).toThrow(ImmutableTopListError);
  });
});
