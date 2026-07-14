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
import { ArticlesService, type CreateArticleCommand, type UpdateArticleCommand } from './articles.service';
import type { IArticlesRepository } from '../repository/articles-repository.interface';
import type { ICategoriesRepository } from '../repository/categories-repository.interface';
import type { ITagsRepository } from '../repository/tags-repository.interface';
import { Article } from '../domain/article.entity';
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '@/common/errors/http.errors';
import { DuplicateKeyRepositoryError } from '../repository/repository-errors';

describe('ArticlesService & Locked Domain Integration', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let findBySlugMock: ReturnType<typeof mock>;
  let existsMock: ReturnType<typeof mock>;
  let existsBySlugMock: ReturnType<typeof mock>;
  let saveMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let softDeleteMock: ReturnType<typeof mock>;
  let restoreMock: ReturnType<typeof mock>;
  let searchMock: ReturnType<typeof mock>;
  let countMock: ReturnType<typeof mock>;
  let incrementViewCountMock: ReturnType<typeof mock>;
  let findArticlesByTagMock: ReturnType<typeof mock>;
  let findTagsByArticleIdMock: ReturnType<typeof mock>;
  let addTagsToArticleMock: ReturnType<typeof mock>;
  let removeTagsFromArticleMock: ReturnType<typeof mock>;
  let replaceTagsOfArticleMock: ReturnType<typeof mock>;

  let catExistsMock: ReturnType<typeof mock>;
  let tagFindByIdsMock: ReturnType<typeof mock>;

  let articlesRepo: IArticlesRepository;
  let categoriesRepo: ICategoriesRepository;
  let tagsRepo: ITagsRepository;
  let service: ArticlesService;

  const articleId = '019f4bc4-f550-7d52-bba4-3b6258b55703';
  const categoryId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const authorId = '019f4bc4-f550-7d52-bba4-3b6258b55710';
  const title = 'Kinh nghiệm du lịch Hoàng Su Phì';
  const slug = 'kinh-nghiem-du-lich-hoang-su-phi';
  const excerpt = 'Cẩm nang du lịch phượt Hoàng Su Phì tự túc.';
  const content = 'Nội dung chi tiết bài viết...';

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
    existsMock = mock(() => Promise.resolve(false));
    existsBySlugMock = mock(() => Promise.resolve(false));
    saveMock = mock(() => Promise.resolve());
    updateMock = mock(() => Promise.resolve());
    softDeleteMock = mock(() => Promise.resolve());
    restoreMock = mock(() => Promise.resolve());
    searchMock = mock(() => Promise.resolve({ items: [], total: 0 }));
    countMock = mock(() => Promise.resolve(0));
    incrementViewCountMock = mock(() => Promise.resolve());
    findArticlesByTagMock = mock(() => Promise.resolve({ items: [], total: 0 }));
    findTagsByArticleIdMock = mock(() => Promise.resolve([]));
    addTagsToArticleMock = mock(() => Promise.resolve());
    removeTagsFromArticleMock = mock(() => Promise.resolve());
    replaceTagsOfArticleMock = mock(() => Promise.resolve());

    catExistsMock = mock(() => Promise.resolve(true));
    tagFindByIdsMock = mock(() => Promise.resolve([]));

    articlesRepo = {
      findById: findByIdMock,
      findBySlug: findBySlugMock,
      exists: existsMock,
      existsBySlug: existsBySlugMock,
      save: saveMock,
      update: updateMock,
      softDelete: softDeleteMock,
      restore: restoreMock,
      search: searchMock,
      count: countMock,
      incrementViewCount: incrementViewCountMock,
      findArticlesByTag: findArticlesByTagMock,
      findTagsByArticleId: findTagsByArticleIdMock,
      addTagsToArticle: addTagsToArticleMock,
      removeTagsFromArticle: removeTagsFromArticleMock,
      replaceTagsOfArticle: replaceTagsOfArticleMock,
    };

    categoriesRepo = {
      findById: mock(() => Promise.resolve(null)),
      findByCode: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      exists: catExistsMock,
      existsByCode: mock(() => Promise.resolve(false)),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
    };

    tagsRepo = {
      findById: mock(() => Promise.resolve(null)),
      findBySlug: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      findByIds: tagFindByIdsMock,
      exists: mock(() => Promise.resolve(false)),
      existsBySlug: mock(() => Promise.resolve(false)),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
    };

    mockLogger.info.mockClear();
    mockLogger.error.mockClear();

    service = new ArticlesService(articlesRepo, categoriesRepo, tagsRepo, mockLogger, mockClock);
  });

  describe('getArticleById', () => {
    test('should return an article when found', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const result = await service.getArticleById(articleId);
      expect(result).toBe(article);
      expect(findByIdMock).toHaveBeenCalledWith(articleId, undefined);
    });

    test('should throw NotFoundError when not found', async () => {
      findByIdMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getArticleById(articleId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getArticleBySlug', () => {
    test('should return an article when found', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findBySlugMock.mockImplementation(() => Promise.resolve(article));

      const result = await service.getArticleBySlug(slug);
      expect(result).toBe(article);
      expect(findBySlugMock).toHaveBeenCalledWith(slug, undefined);
    });

    test('should throw NotFoundError when not found', async () => {
      findBySlugMock.mockImplementation(() => Promise.resolve(null));
      await expect(service.getArticleBySlug(slug)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createArticle & Service Validation delegating to Domain', () => {
    test('should create article successfully without tags', async () => {
      const cmd: CreateArticleCommand = {
        title,
        excerpt,
        content,
        categoryId,
        authorId,
      };

      catExistsMock.mockImplementation(() => Promise.resolve(true));
      existsBySlugMock.mockImplementation(() => Promise.resolve(false));

      const result = await service.createArticle(cmd);
      expect(result.title).toBe(title);
      expect(result.slug).toBe(slug);
      expect(result.status).toBe('draft');
      expect(saveMock).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should throw ValidationError if title is empty (delegated to Domain)', async () => {
      const cmd: CreateArticleCommand = {
        title: '   ',
        excerpt,
        content,
        categoryId,
        authorId,
      };
      // Domain will throw and Service will catch and map to ValidationError
      await expect(service.createArticle(cmd)).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if slug format is invalid (delegated to Domain)', async () => {
      const cmd: CreateArticleCommand = {
        title,
        slug: 'invalid slug here!',
        excerpt,
        content,
        categoryId,
        authorId,
      };
      await expect(service.createArticle(cmd)).rejects.toThrow(ValidationError);
    });

    test('should throw NotFoundError if category does not exist', async () => {
      catExistsMock.mockImplementation(() => Promise.resolve(false));
      const cmd: CreateArticleCommand = {
        title,
        excerpt,
        content,
        categoryId,
        authorId,
      };
      await expect(service.createArticle(cmd)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateArticle & Archived validation', () => {
    test('should update article successfully', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const cmd: UpdateArticleCommand = {
        title: 'New Title',
        excerpt: 'New Excerpt',
        content: 'New Content',
        isFeatured: true,
      };

      const result = await service.updateArticle(articleId, cmd, { id: authorId, roles: [] });
      expect(result.title).toBe('New Title');
      expect(result.slug).toBe('new-title');
      expect(result.excerpt).toBe('New Excerpt');
      expect(result.content).toBe('New Content');
      expect(result.isFeatured).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    test('should throw AuthorizationError when non-owner updates article', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const cmd: UpdateArticleCommand = { title: 'New Title' };
      await expect(service.updateArticle(articleId, cmd, { id: 'other-user-id', roles: [] })).rejects.toThrow(AuthorizationError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('should allow admin to update another user\'s article', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const cmd: UpdateArticleCommand = { title: 'Admin Title' };
      const result = await service.updateArticle(articleId, cmd, { id: 'admin-user-id', roles: ['admin'] });
      expect(result.title).toBe('Admin Title');
      expect(updateMock).toHaveBeenCalled();
    });

    test('should throw ValidationError when updating archived article', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.submitForReview();
      article.publish();
      article.archive();
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const cmd: UpdateArticleCommand = { title: 'Some Title' };
      await expect(service.updateArticle(articleId, cmd, { id: authorId, roles: [] })).rejects.toThrow(ValidationError);
    });

    test('should throw NotFoundError and not update article if category does not exist', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));
      catExistsMock.mockImplementation(() => Promise.resolve(false));

      const cmd: UpdateArticleCommand = { categoryId: 'non-existent-cat-id' };
      await expect(service.updateArticle(articleId, cmd, { id: authorId, roles: [] })).rejects.toThrow(NotFoundError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('should throw ConflictError and not update article if slug already exists', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));
      existsBySlugMock.mockImplementation(() => Promise.resolve(true));

      const cmd: UpdateArticleCommand = { slug: 'already-existing-slug' };
      await expect(service.updateArticle(articleId, cmd, { id: authorId, roles: [] })).rejects.toThrow(ConflictError);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('CMS Workflows & Workflow Invariants', () => {
    test('submitReview should transition draft to under_review', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const result = await service.submitReview(articleId, { id: authorId, roles: [] });
      expect(result.status).toBe('under_review');
      expect(updateMock).toHaveBeenCalled();
    });

    test('submitReview should throw AuthorizationError if non-owner submits', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.submitReview(articleId, { id: 'other-user-id', roles: [] })).rejects.toThrow(AuthorizationError);
    });

    test('archiveArticle should transition published to archived', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.submitForReview();
      article.publish();
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const result = await service.archiveArticle(articleId, { id: authorId, roles: [] });
      expect(result.status).toBe('archived');
      expect(updateMock).toHaveBeenCalled();
    });

    test('archiveArticle should throw AuthorizationError if non-owner archives', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.submitForReview();
      article.publish();
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.archiveArticle(articleId, { id: 'other-user-id', roles: [] })).rejects.toThrow(AuthorizationError);
    });

    test('archiveArticle should throw ValidationError if article is draft', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.archiveArticle(articleId, { id: authorId, roles: [] })).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteArticle & restoreArticle', () => {
    test('deleteArticle should soft-delete article successfully', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await service.deleteArticle(articleId, { id: authorId, roles: [] });
      expect(softDeleteMock).toHaveBeenCalledWith(articleId, {});
    });

    test('deleteArticle should throw AuthorizationError if non-owner deletes', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.deleteArticle(articleId, { id: 'other-user-id', roles: [] })).rejects.toThrow(AuthorizationError);
    });

    test('deleteArticle should throw ValidationError if article is already deleted', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.softDelete(); // set deletedAt
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.deleteArticle(articleId, { id: authorId, roles: [] })).rejects.toThrow(ValidationError);
      expect(softDeleteMock).not.toHaveBeenCalled();
    });

    test('restoreArticle should restore article successfully without calling repository restore', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.softDelete(); // set deletedAt
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      const result = await service.restoreArticle(articleId, { id: authorId, roles: [] });
      expect(result.deletedAt).toBeNull();
      expect(updateMock).toHaveBeenCalled();
      expect(restoreMock).not.toHaveBeenCalled(); // redundant repo restore should not be called
    });

    test('restoreArticle should throw AuthorizationError if non-owner restores', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      article.softDelete(); // set deletedAt
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.restoreArticle(articleId, { id: 'other-user-id', roles: [] })).rejects.toThrow(AuthorizationError);
    });

    test('restoreArticle should throw ValidationError if article is not deleted', async () => {
      const article = Article.create(articleId, title, slug, excerpt, content, categoryId, authorId);
      findByIdMock.mockImplementation(() => Promise.resolve(article));

      await expect(service.restoreArticle(articleId, { id: authorId, roles: [] })).rejects.toThrow(ValidationError);
    });
  });
});
