import { expect, test, describe, mock, beforeEach } from 'bun:test';
import { FaqService } from './faq.service';
import { TopListService } from './top-list.service';
import type { IFaqRepository } from '../repository/faq-repository.interface';
import type { ITopListRepository } from '../repository/top-list-repository.interface';
import { Faq } from '../domain/faq.entity';
import { TopList } from '../domain/top-list.entity';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';

// ─── FAQ Service Tests ────────────────────────────────────────────────────────

describe('FaqService', () => {
  let faqService: FaqService;

  const sampleRawFaq = {
    id: 'faq-01',
    question: 'What is HoangSuPhi?',
    answer: 'A tourism platform.',
    category: 'general',
    displayOrder: 1,
    status: 'DRAFT' as const,
    createdBy: 'user-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockFindById = mock(() => Promise.resolve(null as any));
  const mockCreate = mock(() => Promise.resolve());
  const mockUpdate = mock(() => Promise.resolve());
  const mockDelete = mock(() => Promise.resolve());
  const mockExists = mock(() => Promise.resolve(false));
  const mockFindMany = mock(() => Promise.resolve({ items: [], total: 0 } as any));
  const mockCount = mock(() => Promise.resolve(0));

  const mockFaqRepo: IFaqRepository = {
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    exists: mockExists,
    findMany: mockFindMany,
    count: mockCount,
  };

  beforeEach(() => {
    faqService = new FaqService(mockFaqRepo);
    mockFindById.mockImplementation(() => Promise.resolve(null as any));
    mockCreate.mockImplementation(() => Promise.resolve());
    mockUpdate.mockImplementation(() => Promise.resolve());
    mockDelete.mockImplementation(() => Promise.resolve());
    mockFindById.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
  });

  describe('createFaq()', () => {
    test('should create FAQ and persist', async () => {
      const faq = await faqService.createFaq({
        question: 'What is HoangSuPhi?',
        answer: 'A great app.',
        createdBy: 'user-01',
      });

      expect(faq.status).toBe('DRAFT');
      expect(faq.question).toBe('What is HoangSuPhi?');
      expect(mockCreate).toHaveBeenCalled();
    });

    test('should throw ValidationError if question is empty', async () => {
      await expect(
        faqService.createFaq({ question: '', answer: 'A', createdBy: 'user-01' })
      ).rejects.toThrow(ValidationError);
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      mockCreate.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('Dup')));
      await expect(
        faqService.createFaq({ question: 'Q?', answer: 'A', createdBy: 'user-01' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateFaq()', () => {
    test('should update FAQ successfully', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockFindById.mockImplementation(() => Promise.resolve(faq));

      const updated = await faqService.updateFaq('faq-01', { question: 'New Q?' });
      expect(updated.question).toBe('New Q?');
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw NotFoundError if FAQ not found', async () => {
      await expect(faqService.updateFaq('missing', { question: 'Q?' })).rejects.toThrow(NotFoundError);
    });

    test('should throw EntityNotFoundRepositoryError mapped to NotFoundError on update failure', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockFindById.mockImplementation(() => Promise.resolve(faq));
      mockUpdate.mockImplementation(() => Promise.reject(new EntityNotFoundRepositoryError('NF')));
      await expect(faqService.updateFaq('faq-01', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('publishFaq()', () => {
    test('should publish DRAFT FAQ', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockFindById.mockImplementation(() => Promise.resolve(faq));
      const published = await faqService.publishFaq('faq-01');
      expect(published.status).toBe('PUBLISHED');
    });

    test('should throw NotFoundError if FAQ not found', async () => {
      await expect(faqService.publishFaq('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('archiveFaq()', () => {
    test('should archive FAQ', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockFindById.mockImplementation(() => Promise.resolve(faq));
      const archived = await faqService.archiveFaq('faq-01');
      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('deleteFaq()', () => {
    test('should soft delete FAQ', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockFindById.mockImplementation(() => Promise.resolve(faq));
      await faqService.deleteFaq('faq-01');
      expect(faq.deletedAt).not.toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});

// ─── TopList Service Tests ────────────────────────────────────────────────────

describe('TopListService', () => {
  let topListService: TopListService;

  const sampleRawTopList = {
    id: 'list-01',
    title: 'Best Places',
    description: null,
    slug: 'best-places',
    category: 'tourism',
    featured: false,
    status: 'DRAFT' as const,
    createdBy: 'user-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleRawItem = {
    id: 'item-01',
    topListId: 'list-01',
    ownerType: 'PLACE' as const,
    ownerId: 'place-01',
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFindById = mock(() => Promise.resolve(null as any));
  const mockFindBySlug = mock(() => Promise.resolve(null as any));
  const mockCreate = mock(() => Promise.resolve());
  const mockUpdate = mock(() => Promise.resolve());
  const mockDelete = mock(() => Promise.resolve());
  const mockExists = mock(() => Promise.resolve(false));
  const mockFindMany = mock(() => Promise.resolve({ items: [], total: 0 } as any));
  const mockCount = mock(() => Promise.resolve(0));

  const mockTopListRepo: ITopListRepository = {
    findById: mockFindById,
    findBySlug: mockFindBySlug,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    exists: mockExists,
    findMany: mockFindMany,
    count: mockCount,
  };

  beforeEach(() => {
    topListService = new TopListService(mockTopListRepo);
    mockFindById.mockImplementation(() => Promise.resolve(null as any));
    mockFindBySlug.mockImplementation(() => Promise.resolve(null as any));
    mockCreate.mockImplementation(() => Promise.resolve());
    mockUpdate.mockImplementation(() => Promise.resolve());
    mockDelete.mockImplementation(() => Promise.resolve());
    mockFindById.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
  });

  describe('createTopList()', () => {
    test('should create and persist top list', async () => {
      const result = await topListService.createTopList({
        title: 'Best Places',
        slug: 'best-places',
        createdBy: 'user-01',
      });
      expect(result.status).toBe('DRAFT');
      expect(result.title).toBe('Best Places');
      expect(mockCreate).toHaveBeenCalled();
    });

    test('should throw ValidationError if title is empty', async () => {
      await expect(
        topListService.createTopList({ title: '', slug: 'slug', createdBy: 'user-01' })
      ).rejects.toThrow(ValidationError);
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      mockCreate.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('slug conflict')));
      await expect(
        topListService.createTopList({ title: 'T', slug: 'dup-slug', createdBy: 'user-01' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateTopList()', () => {
    test('should update title and featured', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      const updated = await topListService.updateTopList('list-01', { title: 'New Title', featured: true });
      expect(updated.title).toBe('New Title');
      expect(updated.featured).toBe(true);
    });

    test('should throw NotFoundError if list does not exist', async () => {
      await expect(topListService.updateTopList('missing', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('publishTopList()', () => {
    test('should publish top list with items', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      const published = await topListService.publishTopList('list-01');
      expect(published.status).toBe('PUBLISHED');
    });

    test('should throw ValidationError if top list is empty', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));
      await expect(topListService.publishTopList('list-01')).rejects.toThrow(ValidationError);
    });
  });

  describe('archiveTopList()', () => {
    test('should archive top list', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));
      const archived = await topListService.archiveTopList('list-01');
      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('deleteTopList()', () => {
    test('should soft delete top list', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));
      await topListService.deleteTopList('list-01');
      expect(topList.deletedAt).not.toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('addItemToTopList()', () => {
    test('should add item to top list and update repo', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      const item = await topListService.addItemToTopList('list-01', {
        ownerType: 'PLACE',
        ownerId: 'place-99',
      });

      expect(item.ownerId).toBe('place-99');
      expect(topList.items.length).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw ValidationError on duplicate item', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      await expect(
        topListService.addItemToTopList('list-01', { ownerType: 'PLACE', ownerId: 'place-01' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removeItemFromTopList()', () => {
    test('should remove item and persist', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      await topListService.removeItemFromTopList('list-01', 'item-01');
      expect(topList.items.length).toBe(0);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('reorderTopListItems()', () => {
    test('should reorder items and persist', async () => {
      const item2 = { ...sampleRawItem, id: 'item-02', ownerId: 'place-02', displayOrder: 2 };
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem, item2] });
      mockFindById.mockImplementation(() => Promise.resolve(topList));

      await topListService.reorderTopListItems('list-01', [
        { id: 'item-01', displayOrder: 2 },
        { id: 'item-02', displayOrder: 1 },
      ]);

      expect(topList.items.find((i) => i.id === 'item-01')?.displayOrder).toBe(2);
      expect(topList.items.find((i) => i.id === 'item-02')?.displayOrder).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
