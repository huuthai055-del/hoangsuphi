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

import { beforeEach, describe, expect, test } from 'bun:test';
import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { Tag } from '../domain/tag.entity';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '../repository/repository-errors';
import type { ITagsRepository } from '../repository/tags-repository.interface';
import { type CreateTagCommand, TagsService, type UpdateTagCommand } from './tags.service';

describe('TagsService', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let findBySlugMock: ReturnType<typeof mock>;
  let findAllMock: ReturnType<typeof mock>;
  let existsMock: ReturnType<typeof mock>;
  let existsBySlugMock: ReturnType<typeof mock>;
  let saveMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let deleteMock: ReturnType<typeof mock>;

  let tagsRepo: ITagsRepository;
  let service: TagsService;

  const tagId = '019f4bc4-f550-7d52-bba4-3b6258b55702';
  const tagSlug = 'ruong-bac-thang';
  const tagName = 'Ruộng bậc thang';
  const tagDesc = 'Du lịch ruộng bậc thang';

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
    findBySlugMock = mock(() => Promise.resolve(null));
    findAllMock = mock(() => Promise.resolve([]));
    existsMock = mock(() => Promise.resolve(false));
    existsBySlugMock = mock(() => Promise.resolve(false));
    saveMock = mock(() => Promise.resolve());
    updateMock = mock(() => Promise.resolve());
    deleteMock = mock(() => Promise.resolve());

    tagsRepo = {
      findById: findByIdMock,
      findBySlug: findBySlugMock,
      findAll: findAllMock,
      findByIds: mock(() => Promise.resolve([])),
      exists: existsMock,
      existsBySlug: existsBySlugMock,
      save: saveMock,
      update: updateMock,
      delete: deleteMock,
    };

    mockLogger.info.mockClear();
    mockLogger.error.mockClear();

    service = new TagsService(tagsRepo, mockLogger, mockClock);
  });

  describe('getTagById', () => {
    test('should return tag when found', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true);
      findByIdMock.mockImplementation(() => Promise.resolve(mockTag));

      const result = await service.getTagById(tagId);
      expect(result).toBe(mockTag);
      expect(findByIdMock).toHaveBeenCalledWith(tagId);
    });

    test('should throw NotFoundError when not found', async () => {
      findByIdMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getTagById(tagId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTagBySlug', () => {
    test('should return tag when found', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true);
      findBySlugMock.mockImplementation(() => Promise.resolve(mockTag));

      const result = await service.getTagBySlug(tagSlug);
      expect(result).toBe(mockTag);
      expect(findBySlugMock).toHaveBeenCalledWith(tagSlug);
    });

    test('should throw NotFoundError when not found', async () => {
      findBySlugMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getTagBySlug(tagSlug)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listTags', () => {
    test('should return list of tags', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true);
      findAllMock.mockImplementation(() => Promise.resolve([mockTag]));

      const result = await service.listTags({ featuredOnly: true });
      expect(result).toEqual([mockTag]);
      expect(findAllMock).toHaveBeenCalledWith({ featuredOnly: true });
    });
  });

  describe('searchTags', () => {
    test('should search tags and filter in memory by keyword', async () => {
      const mockTag1 = Tag.create('id-1', 'Ruộng bậc thang', 'ruong-bac-thang', null);
      const mockTag2 = Tag.create('id-2', 'Chè Shan Tuyết', 'che-shan-tuyet', null);
      findAllMock.mockImplementation(() => Promise.resolve([mockTag1, mockTag2]));

      const result1 = await service.searchTags('ruộng');
      expect(result1).toEqual([mockTag1]);

      const result2 = await service.searchTags('shan');
      expect(result2).toEqual([mockTag2]);

      const resultAll = await service.searchTags('');
      expect(resultAll.length).toBe(2);
    });
  });

  describe('createTag', () => {
    test('should create a tag successfully', async () => {
      const cmd: CreateTagCommand = {
        name: tagName,
        slug: tagSlug,
        description: tagDesc,
        isFeatured: true,
      };

      existsBySlugMock.mockImplementation(() => Promise.resolve(false));

      const result = await service.createTag(cmd);
      expect(result.name).toBe(tagName);
      expect(result.slug).toBe(tagSlug);
      expect(result.description).toBe(tagDesc);
      expect(result.isFeatured).toBe(true);
      expect(saveMock).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should throw ValidationError if name is empty', async () => {
      const cmd: CreateTagCommand = {
        name: '   ',
      };
      await expect(service.createTag(cmd)).rejects.toThrow(ValidationError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should auto-generate slug if not provided', async () => {
      const cmd: CreateTagCommand = {
        name: tagName,
      };

      existsBySlugMock.mockImplementation(() => Promise.resolve(false));

      const result = await service.createTag(cmd);
      expect(result.slug).toBe(tagSlug);
    });

    test('should throw ValidationError if slug is invalid', async () => {
      const cmd: CreateTagCommand = {
        name: tagName,
        slug: 'invalid slug here',
      };

      await expect(service.createTag(cmd)).rejects.toThrow(ValidationError);
    });

    test('should throw ConflictError if slug already exists', async () => {
      const cmd: CreateTagCommand = {
        name: tagName,
        slug: tagSlug,
      };

      existsBySlugMock.mockImplementation(() => Promise.resolve(true));
      await expect(service.createTag(cmd)).rejects.toThrow(ConflictError);
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      const cmd: CreateTagCommand = {
        name: tagName,
        slug: tagSlug,
      };

      existsBySlugMock.mockImplementation(() => Promise.resolve(false));
      saveMock.mockImplementation(() =>
        Promise.reject(new DuplicateKeyRepositoryError('Duplicate key'))
      );

      await expect(service.createTag(cmd)).rejects.toThrow(ConflictError);
    });
  });

  describe('updateTag', () => {
    test('should update tag name, description and featured status', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, false);
      findByIdMock.mockImplementation(() => Promise.resolve(mockTag));

      const cmd: UpdateTagCommand = {
        name: 'Updated Name',
        description: 'Updated Description',
        isFeatured: true,
      };

      const result = await service.updateTag(tagId, cmd);
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(result.isFeatured).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    test('should unfeature tag when isFeatured is false', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true);
      findByIdMock.mockImplementation(() => Promise.resolve(mockTag));

      const cmd: UpdateTagCommand = {
        isFeatured: false,
      };

      const result = await service.updateTag(tagId, cmd);
      expect(result.isFeatured).toBe(false);
    });

    test('should throw NotFoundError if tag does not exist', async () => {
      findByIdMock.mockImplementation(() => Promise.resolve(null));
      const cmd: UpdateTagCommand = { name: 'New' };

      await expect(service.updateTag(tagId, cmd)).rejects.toThrow(NotFoundError);
    });

    test('should map EntityNotFoundRepositoryError to NotFoundError', async () => {
      const mockTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true);
      findByIdMock.mockImplementation(() => Promise.resolve(mockTag));
      updateMock.mockImplementation(() =>
        Promise.reject(new EntityNotFoundRepositoryError('Not found'))
      );

      const cmd: UpdateTagCommand = { name: 'New Name' };
      await expect(service.updateTag(tagId, cmd)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTag', () => {
    test('should delete tag successfully', async () => {
      existsMock.mockImplementation(() => Promise.resolve(true));

      await service.deleteTag(tagId);
      expect(deleteMock).toHaveBeenCalledWith(tagId);
    });

    test('should throw NotFoundError if tag does not exist', async () => {
      existsMock.mockImplementation(() => Promise.resolve(false));

      await expect(service.deleteTag(tagId)).rejects.toThrow(NotFoundError);
    });

    test('should map EntityNotFoundRepositoryError to NotFoundError', async () => {
      existsMock.mockImplementation(() => Promise.resolve(true));
      deleteMock.mockImplementation(() =>
        Promise.reject(new EntityNotFoundRepositoryError('Not found'))
      );

      await expect(service.deleteTag(tagId)).rejects.toThrow(NotFoundError);
    });
  });
});
