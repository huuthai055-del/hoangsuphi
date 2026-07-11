import { mock } from 'bun:test';

// Mock the database client to prevent actual connections during unit tests
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {};
        return cb(mockTx);
      },
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

import { expect, test, describe, beforeEach } from 'bun:test';
import { CategoriesService, type CreateCategoryCommand, type UpdateCategoryCommand } from './categories.service';
import type { ICategoriesRepository } from '../repository/categories-repository.interface';
import { Category } from '../domain/category.entity';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import { DuplicateKeyRepositoryError, EntityNotFoundRepositoryError } from '../repository/repository-errors';

describe('CategoriesService', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let findByCodeMock: ReturnType<typeof mock>;
  let findAllMock: ReturnType<typeof mock>;
  let existsMock: ReturnType<typeof mock>;
  let existsByCodeMock: ReturnType<typeof mock>;
  let saveMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let deleteMock: ReturnType<typeof mock>;

  let categoriesRepo: ICategoriesRepository;
  let service: CategoriesService;

  const catId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const catCode = 'travel-guides';
  const catName = 'Travel Guides';
  const catDesc = 'Detailed travel guides';

  const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
  };

  const mockClock = {
    now: () => new Date(),
  };

  beforeEach(() => {
    findByIdMock = mock(() => Promise.resolve(null));
    findByCodeMock = mock(() => Promise.resolve(null));
    findAllMock = mock(() => Promise.resolve([]));
    existsMock = mock(() => Promise.resolve(false));
    existsByCodeMock = mock(() => Promise.resolve(false));
    saveMock = mock(() => Promise.resolve());
    updateMock = mock(() => Promise.resolve());
    deleteMock = mock(() => Promise.resolve());

    categoriesRepo = {
      findById: findByIdMock,
      findByCode: findByCodeMock,
      findAll: findAllMock,
      exists: existsMock,
      existsByCode: existsByCodeMock,
      save: saveMock,
      update: updateMock,
      delete: deleteMock,
    };

    mockLogger.info.mockClear();
    mockLogger.error.mockClear();

    service = new CategoriesService(categoriesRepo, mockLogger, mockClock);
  });

  describe('getCategoryById', () => {
    test('should return a category when found', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findByIdMock.mockImplementation(() => Promise.resolve(mockCat));

      const result = await service.getCategoryById(catId);
      expect(result).toBe(mockCat);
      expect(findByIdMock).toHaveBeenCalledWith(catId);
    });

    test('should throw NotFoundError when not found', async () => {
      findByIdMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getCategoryById(catId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCategoryByCode', () => {
    test('should return a category when found', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findByCodeMock.mockImplementation(() => Promise.resolve(mockCat));

      const result = await service.getCategoryByCode(catCode);
      expect(result).toBe(mockCat);
      expect(findByCodeMock).toHaveBeenCalledWith(catCode);
    });

    test('should throw NotFoundError when not found', async () => {
      findByCodeMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getCategoryByCode(catCode)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listCategories', () => {
    test('should return list of categories', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findAllMock.mockImplementation(() => Promise.resolve([mockCat]));

      const result = await service.listCategories();
      expect(result).toEqual([mockCat]);
      expect(findAllMock).toHaveBeenCalled();
    });
  });

  describe('createCategory', () => {
    test('should create a category successfully', async () => {
      const cmd: CreateCategoryCommand = {
        code: catCode,
        name: catName,
        description: catDesc,
      };

      existsByCodeMock.mockImplementation(() => Promise.resolve(false));

      const result = await service.createCategory(cmd);
      expect(result.code).toBe(catCode);
      expect(result.name).toBe(catName);
      expect(result.description).toBe(catDesc);
      expect(saveMock).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should throw ValidationError if code is invalid', async () => {
      const cmd: CreateCategoryCommand = {
        code: 'invalid code here',
        name: catName,
      };

      await expect(service.createCategory(cmd)).rejects.toThrow(ValidationError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should throw ConflictError if code already exists', async () => {
      const cmd: CreateCategoryCommand = {
        code: catCode,
        name: catName,
      };

      existsByCodeMock.mockImplementation(() => Promise.resolve(true));
      await expect(service.createCategory(cmd)).rejects.toThrow(ConflictError);
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      const cmd: CreateCategoryCommand = {
        code: catCode,
        name: catName,
      };

      existsByCodeMock.mockImplementation(() => Promise.resolve(false));
      saveMock.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('Duplicate key')));

      await expect(service.createCategory(cmd)).rejects.toThrow(ConflictError);
    });
  });

  describe('updateCategory', () => {
    test('should update category name and description', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findByIdMock.mockImplementation(() => Promise.resolve(mockCat));

      const cmd: UpdateCategoryCommand = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const result = await service.updateCategory(catId, cmd);
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(updateMock).toHaveBeenCalled();
    });

    test('should keep original values if fields are not provided', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findByIdMock.mockImplementation(() => Promise.resolve(mockCat));

      const cmd: UpdateCategoryCommand = {};

      const result = await service.updateCategory(catId, cmd);
      expect(result.name).toBe(catName);
      expect(result.description).toBe(catDesc);
    });

    test('should throw NotFoundError if category does not exist', async () => {
      findByIdMock.mockImplementation(() => Promise.resolve(null));
      const cmd: UpdateCategoryCommand = { name: 'New' };

      await expect(service.updateCategory(catId, cmd)).rejects.toThrow(NotFoundError);
    });

    test('should map EntityNotFoundRepositoryError to NotFoundError', async () => {
      const mockCat = Category.create(catId, catCode, catName, catDesc);
      findByIdMock.mockImplementation(() => Promise.resolve(mockCat));
      updateMock.mockImplementation(() => Promise.reject(new EntityNotFoundRepositoryError('Not found')));

      const cmd: UpdateCategoryCommand = { name: 'New Name' };
      await expect(service.updateCategory(catId, cmd)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteCategory', () => {
    test('should delete category successfully', async () => {
      existsMock.mockImplementation(() => Promise.resolve(true));

      await service.deleteCategory(catId);
      expect(deleteMock).toHaveBeenCalledWith(catId);
    });

    test('should throw NotFoundError if category does not exist', async () => {
      existsMock.mockImplementation(() => Promise.resolve(false));

      await expect(service.deleteCategory(catId)).rejects.toThrow(NotFoundError);
    });

    test('should map EntityNotFoundRepositoryError to NotFoundError', async () => {
      existsMock.mockImplementation(() => Promise.resolve(true));
      deleteMock.mockImplementation(() => Promise.reject(new EntityNotFoundRepositoryError('Not found')));

      await expect(service.deleteCategory(catId)).rejects.toThrow(NotFoundError);
    });
  });
});
