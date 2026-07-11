import { describe, test, expect, mock, beforeEach } from 'bun:test';

// 1. Setup global resolve value for the thenable DB chain
let mockResolveValue: any = undefined;

const selectSpy = mock(() => mockDbChain);
const insertSpy = mock(() => mockDbChain);
const updateSpy = mock(() => mockDbChain);
const deleteSpy = mock(() => mockDbChain);
const valuesSpy = mock(() => mockDbChain);
const whereSpy = mock(() => mockDbChain);
const innerJoinSpy = mock(() => mockDbChain);
const limitSpy = mock(() => mockDbChain);
const offsetSpy = mock(() => mockDbChain);
const orderBySpy = mock(() => mockDbChain);
const onConflictDoNothingSpy = mock(() => mockDbChain);
const returningSpy = mock(() => mockDbChain);

const selectDistinctOnSpy = mock(() => mockDbChain);

const mockDbChain = {
  select: selectSpy,
  selectDistinctOn: selectDistinctOnSpy,
  from: () => mockDbChain,
  where: whereSpy,
  limit: limitSpy,
  offset: offsetSpy,
  orderBy: orderBySpy,
  innerJoin: innerJoinSpy,
  insert: insertSpy,
  values: valuesSpy,
  onConflictDoNothing: onConflictDoNothingSpy,
  update: updateSpy,
  set: () => mockDbChain,
  delete: deleteSpy,
  returning: returningSpy,
};

// 'then' resolves mockResolveValue or rejects if it is an Error instance
Object.defineProperty(mockDbChain, 'then', {
  value: (onFulfilled: any, onRejected: any) => {
    if (mockResolveValue instanceof Error) {
      return Promise.reject(mockResolveValue).catch(onRejected);
    }
    return Promise.resolve(mockResolveValue).then(onFulfilled, onRejected);
  },
  configurable: true,
  writable: true,
});

// Mock database module
mock.module('@/lib/database/client', () => {
  return {
    db: {
      ...mockDbChain,
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDbChain),
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDbChain),
  };
});

// Import production repositories under test
import { DrizzleCategoriesRepository } from './categories.repository';
import { DrizzleTagsRepository } from './tags.repository';
import { DrizzleArticlesRepository } from './articles.repository';
import { Category } from '../domain/category.entity';
import { Tag } from '../domain/tag.entity';
import { Article } from '../domain/article.entity';
import { CategoryMapper } from './categories.mapper';
import { TagMapper } from './tags.mapper';
import { ArticleMapper } from './articles.mapper';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  DatabaseOperationRepositoryError,
  ConstraintViolationRepositoryError,
  NotNullViolationRepositoryError,
  CheckConstraintViolationRepositoryError,
  TransactionConflictRepositoryError,
} from './repository-errors';

describe('Repositories Layer', () => {
  const categoryId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const tagId = '019f4bc4-f550-7d52-bba4-3b6258b55702';
  const articleId = '019f4bc4-f550-7d52-bba4-3b6258b55703';

  const rawCategory = {
    id: categoryId,
    code: 'guides',
    name: 'Cẩm nang du lịch',
    description: 'Chuyên mục cẩm nang Hoàng Su Phì',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const rawTag = {
    id: tagId,
    name: 'Ruộng bậc thang',
    slug: 'ruong-bac-thang',
    description: 'Tag ruộng bậc thang',
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const rawArticle = {
    id: articleId,
    title: 'Kinh nghiệm du lịch Hoàng Su Phì',
    slug: 'kinh-nghiem-du-lich-hoang-su-phi',
    excerpt: 'Cẩm nang trekking...',
    content: 'Nội dung chi tiết...',
    thumbnailId: '019f4bc4-f550-7d52-bba4-3b6258b55709',
    authorId: '019f4bc4-f550-7d52-bba4-3b6258b55710',
    categoryId: categoryId,
    status: 'draft',
    viewCount: 150,
    isFeatured: false,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  function resetThen() {
    Object.defineProperty(mockDbChain, 'then', {
      value: (onFulfilled: any, onRejected: any) => {
        if (mockResolveValue instanceof Error) {
          return Promise.reject(mockResolveValue).catch(onRejected);
        }
        return Promise.resolve(mockResolveValue).then(onFulfilled, onRejected);
      },
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    mockResolveValue = undefined;
    selectSpy.mockClear();
    insertSpy.mockClear();
    updateSpy.mockClear();
    deleteSpy.mockClear();
    valuesSpy.mockClear();
    whereSpy.mockClear();
    innerJoinSpy.mockClear();
    limitSpy.mockClear();
    offsetSpy.mockClear();
    orderBySpy.mockClear();
    onConflictDoNothingSpy.mockClear();
    returningSpy.mockClear();
    selectDistinctOnSpy.mockClear();
    resetThen();
  });

  // -------------------------------------------------------------------------
  // DrizzleCategoriesRepository
  // -------------------------------------------------------------------------
  describe('DrizzleCategoriesRepository', () => {
    let repo: DrizzleCategoriesRepository;
    beforeEach(() => { repo = new DrizzleCategoriesRepository(); });

    test('findById() should return Category domain entity when found', async () => {
      mockResolveValue = [rawCategory];
      const result = await repo.findById(categoryId);
      expect(result).toBeInstanceOf(Category);
      expect(result?.id).toBe(categoryId);
      expect(selectSpy).toHaveBeenCalled();
    });

    test('findById() should return null when not found', async () => {
      mockResolveValue = [];
      expect(await repo.findById(categoryId)).toBeNull();
    });

    test('findByCode() should return Category domain entity when found', async () => {
      mockResolveValue = [rawCategory];
      expect((await repo.findByCode('guides'))?.code).toBe('guides');
    });

    test('findAll() should return Category array', async () => {
      mockResolveValue = [rawCategory];
      const results = await repo.findAll();
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(categoryId);
    });

    test('exists() and existsByCode() should return boolean', async () => {
      mockResolveValue = [{ exists: 1 }];
      expect(await repo.exists(categoryId)).toBe(true);

      mockResolveValue = [];
      expect(await repo.existsByCode('invalid')).toBe(false);
    });

    test('save() should handle 23505 duplicate, 23503 FK, 23502 NOT NULL, 23514 CHECK, 40001 serialization, 40P01 deadlock violations', async () => {
      const cat = CategoryMapper.toDomain(rawCategory);
      mockResolveValue = undefined;
      await repo.save(cat);
      expect(insertSpy).toHaveBeenCalled();

      mockResolveValue = Object.assign(new Error('dup'), { code: '23505', constraint: 'category_code_key' });
      await expect(repo.save(cat)).rejects.toThrow(DuplicateKeyRepositoryError);

      mockResolveValue = Object.assign(new Error('fk'), { code: '23503', constraint: 'some_fk' });
      await expect(repo.save(cat)).rejects.toThrow(ConstraintViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('not-null'), { code: '23502', column: 'name' });
      await expect(repo.save(cat)).rejects.toThrow(NotNullViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('check'), { code: '23514', constraint: 'articles_status_check' });
      await expect(repo.save(cat)).rejects.toThrow(CheckConstraintViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('serial'), { code: '40001' });
      await expect(repo.save(cat)).rejects.toThrow(TransactionConflictRepositoryError);

      mockResolveValue = Object.assign(new Error('deadlock'), { code: '40P01' });
      await expect(repo.save(cat)).rejects.toThrow(TransactionConflictRepositoryError);

      mockResolveValue = new Error('connection timeout');
      await expect(repo.save(cat)).rejects.toThrow(DatabaseOperationRepositoryError);
    });

    test('update() should check affected rows and handle constraint errors', async () => {
      const cat = CategoryMapper.toDomain(rawCategory);
      mockResolveValue = [{ id: categoryId }];
      await repo.update(cat);
      expect(updateSpy).toHaveBeenCalled();

      mockResolveValue = [];
      await expect(repo.update(cat)).rejects.toThrow(EntityNotFoundRepositoryError);

      const dup = Object.assign(new Error('dup'), { code: '23505', constraint: 'category_code_key' });
      mockResolveValue = dup;
      await expect(repo.update(cat)).rejects.toThrow(DuplicateKeyRepositoryError);

      const fk = Object.assign(new Error('fk'), { code: '23503' });
      mockResolveValue = fk;
      await expect(repo.update(cat)).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('delete() should verify affected rows', async () => {
      mockResolveValue = [{ id: categoryId }];
      await repo.delete(categoryId);
      expect(deleteSpy).toHaveBeenCalled();

      mockResolveValue = [];
      await expect(repo.delete(categoryId)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  // -------------------------------------------------------------------------
  // DrizzleTagsRepository
  // -------------------------------------------------------------------------
  describe('DrizzleTagsRepository', () => {
    let repo: DrizzleTagsRepository;
    beforeEach(() => { repo = new DrizzleTagsRepository(); });

    test('findById() should return Tag domain entity when found', async () => {
      mockResolveValue = [rawTag];
      expect((await repo.findById(tagId))?.slug).toBe('ruong-bac-thang');
    });

    test('findBySlug() should return Tag domain entity when found', async () => {
      mockResolveValue = [rawTag];
      expect((await repo.findBySlug('ruong-bac-thang'))?.id).toBe(tagId);
    });

    test('findAll() with options should return Tag array', async () => {
      mockResolveValue = [rawTag];
      const results = await repo.findAll({ page: 1, limit: 10, featuredOnly: true });
      expect(results.length).toBe(1);

      mockResolveValue = [rawTag];
      expect((await repo.findAll()).length).toBe(1);
    });

    test('findByIds() should return matching Tags array and short-circuit empty', async () => {
      mockResolveValue = [rawTag];
      expect((await repo.findByIds([tagId])).length).toBe(1);
      expect((await repo.findByIds([])).length).toBe(0);
    });

    test('exists() and existsBySlug() should return boolean', async () => {
      mockResolveValue = [{ exists: 1 }];
      expect(await repo.exists(tagId)).toBe(true);

      mockResolveValue = [];
      expect(await repo.existsBySlug('ruong-bac-thang')).toBe(false);
    });

    test('save() should handle 23505 and 23503 violations', async () => {
      const tag = TagMapper.toDomain(rawTag);
      mockResolveValue = undefined;
      await repo.save(tag);

      mockResolveValue = Object.assign(new Error('dup'), { code: '23505' });
      await expect(repo.save(tag)).rejects.toThrow(DuplicateKeyRepositoryError);

      mockResolveValue = Object.assign(new Error('fk'), { code: '23503' });
      await expect(repo.save(tag)).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('update() should check affected rows and handle violations', async () => {
      const tag = TagMapper.toDomain(rawTag);
      mockResolveValue = [{ id: tagId }];
      await repo.update(tag);

      mockResolveValue = [];
      await expect(repo.update(tag)).rejects.toThrow(EntityNotFoundRepositoryError);

      mockResolveValue = Object.assign(new Error('dup'), { code: '23505' });
      await expect(repo.update(tag)).rejects.toThrow(DuplicateKeyRepositoryError);
    });

    test('delete() should verify affected rows', async () => {
      mockResolveValue = [{ id: tagId }];
      await repo.delete(tagId);

      mockResolveValue = [];
      await expect(repo.delete(tagId)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  // -------------------------------------------------------------------------
  // DrizzleArticlesRepository
  // -------------------------------------------------------------------------
  describe('DrizzleArticlesRepository', () => {
    let repo: DrizzleArticlesRepository;
    beforeEach(() => { repo = new DrizzleArticlesRepository(); });

    test('findById() & findBySlug() should return Article domain entity or null', async () => {
      mockResolveValue = [rawArticle];
      expect((await repo.findById(articleId))).toBeInstanceOf(Article);

      mockResolveValue = [];
      expect(await repo.findById(articleId, { includeDeleted: true })).toBeNull();

      mockResolveValue = [rawArticle];
      expect((await repo.findBySlug('kinh-nghiem-du-lich-hoang-su-phi'))?.id).toBe(articleId);

      mockResolveValue = [];
      expect(await repo.findBySlug('kinh-nghiem-du-lich-hoang-su-phi', { includeDeleted: true })).toBeNull();
    });

    test('exists() & existsBySlug() should return boolean', async () => {
      mockResolveValue = [{ exists: 1 }];
      expect(await repo.exists(articleId)).toBe(true);

      mockResolveValue = [];
      expect(await repo.existsBySlug('slug')).toBe(false);
    });

    test('save() should handle 23505, 23503, 23502, 23514, 40001/40P01 DB errors', async () => {
      const article = ArticleMapper.toDomain(rawArticle);
      mockResolveValue = undefined;
      await repo.save(article);
      expect(insertSpy).toHaveBeenCalled();

      mockResolveValue = Object.assign(new Error('dup'), { code: '23505' });
      await expect(repo.save(article)).rejects.toThrow(DuplicateKeyRepositoryError);

      mockResolveValue = Object.assign(new Error('fk'), { code: '23503' });
      await expect(repo.save(article)).rejects.toThrow(ConstraintViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('null'), { code: '23502', column: 'title' });
      await expect(repo.save(article)).rejects.toThrow(NotNullViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('check'), { code: '23514' });
      await expect(repo.save(article)).rejects.toThrow(CheckConstraintViolationRepositoryError);

      mockResolveValue = Object.assign(new Error('serial'), { code: '40001' });
      await expect(repo.save(article)).rejects.toThrow(TransactionConflictRepositoryError);

      mockResolveValue = Object.assign(new Error('deadlock'), { code: '40P01' });
      await expect(repo.save(article)).rejects.toThrow(TransactionConflictRepositoryError);
    });

    test('update() should check affected rows and handle errors', async () => {
      const article = ArticleMapper.toDomain(rawArticle);
      mockResolveValue = [{ id: articleId }];
      await repo.update(article);

      mockResolveValue = [];
      await expect(repo.update(article)).rejects.toThrow(EntityNotFoundRepositoryError);

      mockResolveValue = Object.assign(new Error('dup'), { code: '23505' });
      await expect(repo.update(article)).rejects.toThrow(DuplicateKeyRepositoryError);

      mockResolveValue = Object.assign(new Error('fk'), { code: '23503' });
      await expect(repo.update(article)).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('softDelete() – throws NotFound only if record does not exist at all', async () => {
      // Successful soft delete
      mockResolveValue = [{ id: articleId }];
      await repo.softDelete(articleId);
      expect(updateSpy).toHaveBeenCalled();

      // 0 rows updated but record exists (already deleted) → idempotent
      let calls = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          calls++;
          // 1st call = softDelete update returns [], 2nd = findById with includeDeleted returns row
          const val = calls === 1 ? [] : [rawArticle];
          return Promise.resolve(val).then(onFulfilled, onRejected);
        },
        configurable: true,
      });
      // Should NOT throw
      await repo.softDelete(articleId);

      // 0 rows updated AND record truly does not exist → throw
      calls = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          calls++;
          return Promise.resolve([]).then(onFulfilled, onRejected);
        },
        configurable: true,
      });
      await expect(repo.softDelete(articleId)).rejects.toThrow(EntityNotFoundRepositoryError);

      resetThen();
    });

    test('restore() – throws NotFound only if record does not exist at all', async () => {
      // Successful restore
      mockResolveValue = [{ id: articleId }];
      await repo.restore(articleId);
      expect(updateSpy).toHaveBeenCalled();

      // 0 rows updated but record exists (already active) → idempotent
      let calls = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          calls++;
          const val = calls === 1 ? [] : [rawArticle];
          return Promise.resolve(val).then(onFulfilled, onRejected);
        },
        configurable: true,
      });
      await repo.restore(articleId);

      // 0 rows updated AND record truly does not exist → throw
      calls = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          calls++;
          return Promise.resolve([]).then(onFulfilled, onRejected);
        },
        configurable: true,
      });
      await expect(repo.restore(articleId)).rejects.toThrow(EntityNotFoundRepositoryError);

      resetThen();
    });

    test('findTagsByArticleId() should return Tags with ORDER BY name', async () => {
      mockResolveValue = [rawTag];
      const tagsList = await repo.findTagsByArticleId(articleId);
      expect(tagsList.length).toBe(1);
      expect(tagsList[0]).toBeInstanceOf(Tag);
      expect(innerJoinSpy).toHaveBeenCalled();
      expect(orderBySpy).toHaveBeenCalled(); // ORDER BY tags.name
    });

    test('addTagsToArticle() should deduplicate tagIds and skip empty', async () => {
      mockResolveValue = undefined;
      // Duplicate tag IDs should be deduped to a single insert
      await repo.addTagsToArticle(articleId, [tagId, tagId, tagId]);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      const insertCall = valuesSpy.mock.calls[0][0];
      expect(insertCall.length).toBe(1); // only 1 unique tagId

      insertSpy.mockClear();
      await repo.addTagsToArticle(articleId, []); // empty should skip
      expect(insertSpy).not.toHaveBeenCalled();
    });

    test('removeTagsFromArticle() should deduplicate tagIds and skip empty', async () => {
      await repo.removeTagsFromArticle(articleId, [tagId, tagId]);
      expect(deleteSpy).toHaveBeenCalledTimes(1);

      deleteSpy.mockClear();
      await repo.removeTagsFromArticle(articleId, []);
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    test('replaceTagsOfArticle() should delete then bulk insert (deduplicated) atomically', async () => {
      mockResolveValue = undefined;
      await repo.replaceTagsOfArticle(articleId, [tagId, tagId]);
      expect(deleteSpy).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalled();
      const insertCall = valuesSpy.mock.calls[0][0];
      expect(insertCall.length).toBe(1); // deduped

      insertSpy.mockClear();
      deleteSpy.mockClear();
      await repo.replaceTagsOfArticle(articleId, []); // only delete
      expect(deleteSpy).toHaveBeenCalled();
      expect(insertSpy).not.toHaveBeenCalled();
    });

    test('search() – validates pagination bounds and handles tag join + sort (DISTINCT ON path)', async () => {
      let callCount = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          callCount++;
          const val = callCount === 1 ? [{ totalCount: 2 }] : [rawArticle];
          return Promise.resolve(val).then(onFulfilled, onRejected);
        },
        configurable: true,
      });

      const res = await repo.search(
        {
          keyword: 'trekking 100% _abc_',
          status: 'draft',
          categoryId,
          isFeatured: true,
          tagId,
          authorId: '019f4bc4-f550-7d52-bba4-3b6258b55710',
          publishedOnly: false,
          createdAfter: new Date(Date.now() - 360000),
          createdBefore: new Date(),
          includeDeleted: true,
        },
        { page: -5, pageSize: 500 }, // out of bounds → clamped
        { field: 'publishedAt', order: 'DESC' }
      );

      expect(res.page).toBe(1);       // clamped
      expect(res.pageSize).toBe(100); // clamped to MAX
      expect(res.total).toBe(2);
      expect(res.items.length).toBe(1);
      // When tagId is set: buildSelectQuery uses selectDistinctOn (DISTINCT ON path)
      expect(selectDistinctOnSpy).toHaveBeenCalled();

      resetThen();
    });

    test('search() – default sort and published conditions (non-DISTINCT path)', async () => {
      let callCount = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          callCount++;
          const val = callCount === 1 ? [{ totalCount: 1 }] : [rawArticle];
          return Promise.resolve(val).then(onFulfilled, onRejected);
        },
        configurable: true,
      });

      const res = await repo.search({ publishedOnly: true }, {}, {});
      expect(res.total).toBe(1);
      expect(res.items[0]).toBeInstanceOf(Article);
      // No tagId → regular select (non-DISTINCT path)
      expect(selectSpy).toHaveBeenCalled();
      expect(selectDistinctOnSpy).not.toHaveBeenCalled();

      resetThen();
    });

    test('count() should return total from DB', async () => {
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          return Promise.resolve([{ totalCount: 4 }]).then(onFulfilled, onRejected);
        },
        configurable: true,
      });
      expect(await repo.count({ tagId })).toBe(4);
      resetThen();
    });

    test('findArticlesByTag() should proxy search() and return PaginatedResult', async () => {
      let callCount = 0;
      Object.defineProperty(mockDbChain, 'then', {
        value: (onFulfilled: any, onRejected: any) => {
          callCount++;
          const val = callCount === 1 ? [{ totalCount: 1 }] : [rawArticle];
          return Promise.resolve(val).then(onFulfilled, onRejected);
        },
        configurable: true,
      });

      const res = await repo.findArticlesByTag(tagId);
      expect(res.total).toBe(1);
      expect(res.items[0]).toBeInstanceOf(Article);
      resetThen();
    });

    test('incrementViewCount() should succeed and use LEAST() for overflow protection', async () => {
      mockResolveValue = [{ id: articleId }];
      await repo.incrementViewCount(articleId);
      expect(updateSpy).toHaveBeenCalled();

      mockResolveValue = [];
      await expect(repo.incrementViewCount(articleId)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });
});
