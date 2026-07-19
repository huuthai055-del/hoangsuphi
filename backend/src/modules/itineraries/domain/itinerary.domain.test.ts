import { describe, expect, test } from 'bun:test';
import { ItineraryItem } from './itinerary-item.entity';
import { Itinerary } from './itinerary.entity';
import { DuplicateItineraryItemError, EmptyItineraryError } from './itinerary.errors';

describe('Itinerary Item Domain Entity', () => {
  test('should create itinerary item successfully with valid inputs', () => {
    const item = ItineraryItem.create({
      id: 'item-01',
      itineraryId: 'itinerary-01',
      ownerType: 'PLACE',
      ownerId: 'place-01',
      dayNumber: 2,
      displayOrder: 1,
      note: 'Fabulous check-in spot',
    });

    expect(item.id).toBe('item-01');
    expect(item.dayNumber).toBe(2);
    expect(item.displayOrder).toBe(1);
    expect(item.note).toBe('Fabulous check-in spot');
  });

  test('should validate day number range 1 to 365', () => {
    expect(() => {
      ItineraryItem.create({
        id: 'item-01',
        itineraryId: 'itinerary-01',
        ownerType: 'PLACE',
        ownerId: 'place-01',
        dayNumber: 0,
        displayOrder: 1,
      });
    }).toThrow('Day number must be between 1 and 365');

    expect(() => {
      ItineraryItem.create({
        id: 'item-01',
        itineraryId: 'itinerary-01',
        ownerType: 'PLACE',
        ownerId: 'place-01',
        dayNumber: 366,
        displayOrder: 1,
      });
    }).toThrow('Day number must be between 1 and 365');
  });

  test('should validate display order >= 1', () => {
    expect(() => {
      ItineraryItem.create({
        id: 'item-01',
        itineraryId: 'itinerary-01',
        ownerType: 'PLACE',
        ownerId: 'place-01',
        dayNumber: 1,
        displayOrder: 0,
      });
    }).toThrow('Display order must be at least 1');
  });

  test('should support equality comparison', () => {
    const itemA = ItineraryItem.create({
      id: 'item-01',
      itineraryId: 'itinerary-01',
      ownerType: 'PLACE',
      ownerId: 'place-01',
      dayNumber: 1,
      displayOrder: 1,
    });
    const itemB = ItineraryItem.rehydrate({
      id: 'item-01',
      itineraryId: 'itinerary-01',
      ownerType: 'PLACE',
      ownerId: 'place-01',
      dayNumber: 2,
      displayOrder: 2,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(itemA.equals(itemB)).toBe(true);
  });
});

describe('Itinerary Aggregate Root Domain Entity', () => {
  test('should create itinerary with default status and visibility', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Hanoi to Ha Giang Trip',
      description: ' 4 days adventure ',
      createdBy: 'user-01',
    });

    expect(itinerary.title).toBe('Hanoi to Ha Giang Trip');
    expect(itinerary.description).toBe('4 days adventure');
    expect(itinerary.status).toBe('DRAFT');
    expect(itinerary.visibility).toBe('PRIVATE');
    expect(itinerary.items.length).toBe(0);
  });

  test('should update itinerary basic info', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Hanoi to Ha Giang Trip',
      createdBy: 'user-01',
    });

    itinerary.updateInfo({
      title: 'Ha Giang Loop Expedition',
      description: 'An extreme loop tour',
      visibility: 'PUBLIC',
    });

    expect(itinerary.title).toBe('Ha Giang Loop Expedition');
    expect(itinerary.description).toBe('An extreme loop tour');
    expect(itinerary.visibility).toBe('PUBLIC');
  });

  test('should add items and calculate displayOrder dynamically', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    const item1 = itinerary.addItem({
      id: 'item-1',
      ownerType: 'PLACE',
      ownerId: 'place-1',
      dayNumber: 1,
    });

    const item2 = itinerary.addItem({
      id: 'item-2',
      ownerType: 'BUSINESS',
      ownerId: 'business-2',
      dayNumber: 1,
    });

    const item3 = itinerary.addItem({
      id: 'item-3',
      ownerType: 'ATTRACTION',
      ownerId: 'attraction-3',
      dayNumber: 2,
    });

    expect(itinerary.items.length).toBe(3);
    expect(item1.displayOrder).toBe(1);
    expect(item2.displayOrder).toBe(2);
    expect(item3.displayOrder).toBe(1);
  });

  test('should prevent duplicate items in the same itinerary', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.addItem({
      id: 'item-1',
      ownerType: 'PLACE',
      ownerId: 'place-1',
      dayNumber: 1,
    });

    expect(() => {
      itinerary.addItem({
        id: 'item-2',
        ownerType: 'PLACE',
        ownerId: 'place-1',
        dayNumber: 2,
      });
    }).toThrow(DuplicateItineraryItemError);
  });

  test('should remove item and shift displayOrder sequentially in the same day', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1', dayNumber: 1 });
    const item2 = itinerary.addItem({
      id: 'item-2',
      ownerType: 'BUSINESS',
      ownerId: 'b2',
      dayNumber: 1,
    });
    itinerary.addItem({ id: 'item-3', ownerType: 'ATTRACTION', ownerId: 'a3', dayNumber: 1 });

    itinerary.removeItem(item2.id);

    expect(itinerary.items.length).toBe(2);
    const remaining1 = itinerary.items.find((i) => i.id === 'item-1');
    const remaining3 = itinerary.items.find((i) => i.id === 'item-3');

    expect(remaining1).toBeDefined();
    expect(remaining3).toBeDefined();
    expect(remaining1?.displayOrder).toBe(1);
    expect(remaining3?.displayOrder).toBe(2);
  });

  test('should prevent reordering with non-sequential or incomplete items list', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1', dayNumber: 1 });
    itinerary.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b2', dayNumber: 1 });

    // Incomplete reorder
    expect(() => {
      itinerary.reorderItems([{ id: 'item-1', dayNumber: 1, displayOrder: 1 }]);
    }).toThrow('Reorder list must contain all items in the itinerary exactly');

    // Missing invalid items
    expect(() => {
      itinerary.reorderItems([
        { id: 'item-1', dayNumber: 1, displayOrder: 1 },
        { id: 'item-missing', dayNumber: 1, displayOrder: 2 },
      ]);
    }).toThrow('Item with ID item-missing does not belong to this itinerary');

    // Non-sequential displayOrder (1, 3)
    expect(() => {
      itinerary.reorderItems([
        { id: 'item-1', dayNumber: 1, displayOrder: 1 },
        { id: 'item-2', dayNumber: 1, displayOrder: 3 },
      ]);
    }).toThrow('Display order in day 1 must be sequential starting from 1');
  });

  test('should reorder items successfully if list is valid', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1', dayNumber: 1 });
    itinerary.addItem({ id: 'item-2', ownerType: 'BUSINESS', ownerId: 'b2', dayNumber: 1 });

    itinerary.reorderItems([
      { id: 'item-1', dayNumber: 1, displayOrder: 2 },
      { id: 'item-2', dayNumber: 1, displayOrder: 1 },
    ]);

    const updated1 = itinerary.items.find((i) => i.id === 'item-1');
    const updated2 = itinerary.items.find((i) => i.id === 'item-2');

    expect(updated1).toBeDefined();
    expect(updated2).toBeDefined();
    expect(updated1?.displayOrder).toBe(2);
    expect(updated2?.displayOrder).toBe(1);
  });

  test('should enforce publishing status transitions and item validation', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    // Empty publish throws
    expect(() => {
      itinerary.publish();
    }).toThrow(EmptyItineraryError);

    itinerary.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1', dayNumber: 1 });
    itinerary.publish();

    expect(itinerary.status).toBe('PUBLISHED');

    // Cannot publish again
    expect(() => {
      itinerary.publish();
    }).toThrow('Cannot publish itinerary from status: PUBLISHED');
  });

  test('should enforce archiving status transitions', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.archive();
    expect(itinerary.status).toBe('ARCHIVED');

    // Cannot modify archived itinerary
    expect(() => {
      itinerary.updateInfo({ title: 'New title' });
    }).toThrow('Cannot modify an archived itinerary');

    expect(() => {
      itinerary.archive();
    }).toThrow('Itinerary is already archived');
  });

  test('should enforce softDelete and block mutations', () => {
    const itinerary = Itinerary.create({
      id: 'itinerary-01',
      title: 'Trip',
      createdBy: 'user-01',
    });

    itinerary.softDelete();
    expect(itinerary.deletedAt).not.toBeNull();

    expect(() => {
      itinerary.addItem({ id: 'item-1', ownerType: 'PLACE', ownerId: 'p1', dayNumber: 1 });
    }).toThrow('Cannot modify a deleted itinerary');
  });
});
