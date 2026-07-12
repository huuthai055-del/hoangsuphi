import { mock } from 'bun:test';

// Mock database client
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    dbHealthCheck: async () => Promise.resolve({ status: 'healthy', durationMs: 5 }),
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

mock.module('@/modules/articles/repository/categories.repository', () => {
  return {
    DrizzleCategoriesRepository: class {
      findById(id: string) {
        return (globalThis as any).mockCategoriesFindById
          ? (globalThis as any).mockCategoriesFindById(id)
          : Promise.resolve(null);
      }
      findByCode(code: string) {
        return (globalThis as any).mockCategoriesFindByCode
          ? (globalThis as any).mockCategoriesFindByCode(code)
          : Promise.resolve(null);
      }
      findAll() {
        return (globalThis as any).mockCategoriesFindAll
          ? (globalThis as any).mockCategoriesFindAll()
          : Promise.resolve([]);
      }
      exists(id: string) {
        return (globalThis as any).mockCategoriesExists
          ? (globalThis as any).mockCategoriesExists(id)
          : Promise.resolve(false);
      }
      existsByCode(code: string) {
        return (globalThis as any).mockCategoriesExistsByCode
          ? (globalThis as any).mockCategoriesExistsByCode(code)
          : Promise.resolve(false);
      }
      save(category: any) {
        return (globalThis as any).mockCategoriesSave
          ? (globalThis as any).mockCategoriesSave(category)
          : Promise.resolve();
      }
      update(category: any) {
        return (globalThis as any).mockCategoriesUpdate
          ? (globalThis as any).mockCategoriesUpdate(category)
          : Promise.resolve();
      }
      delete(id: string) {
        return (globalThis as any).mockCategoriesDelete
          ? (globalThis as any).mockCategoriesDelete(id)
          : Promise.resolve();
      }
    },
  };
});

mock.module('@/modules/articles/repository/tags.repository', () => {
  return {
    DrizzleTagsRepository: class {
      findById(id: string) {
        return (globalThis as any).mockTagsFindById
          ? (globalThis as any).mockTagsFindById(id)
          : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockTagsFindBySlug
          ? (globalThis as any).mockTagsFindBySlug(slug)
          : Promise.resolve(null);
      }
      findAll(options?: any) {
        return (globalThis as any).mockTagsFindAll
          ? (globalThis as any).mockTagsFindAll(options)
          : Promise.resolve([]);
      }
      exists(id: string) {
        return (globalThis as any).mockTagsExists
          ? (globalThis as any).mockTagsExists(id)
          : Promise.resolve(false);
      }
      existsBySlug(slug: string) {
        return (globalThis as any).mockTagsExistsBySlug
          ? (globalThis as any).mockTagsExistsBySlug(slug)
          : Promise.resolve(false);
      }
      save(tag: any) {
        return (globalThis as any).mockTagsSave
          ? (globalThis as any).mockTagsSave(tag)
          : Promise.resolve();
      }
      update(tag: any) {
        return (globalThis as any).mockTagsUpdate
          ? (globalThis as any).mockTagsUpdate(tag)
          : Promise.resolve();
      }
      delete(id: string) {
        return (globalThis as any).mockTagsDelete
          ? (globalThis as any).mockTagsDelete(id)
          : Promise.resolve();
      }
      findByIds(ids: string[]) {
        return (globalThis as any).mockTagsFindByIds
          ? (globalThis as any).mockTagsFindByIds(ids)
          : Promise.resolve([]);
      }
    },
  };
});

mock.module('@/modules/articles/repository/articles.repository', () => {
  return {
    DrizzleArticlesRepository: class {
      findById(id: string, options?: any) {
        return (globalThis as any).mockArticlesFindById
          ? (globalThis as any).mockArticlesFindById(id, options)
          : Promise.resolve(null);
      }
      findBySlug(slug: string, options?: any) {
        return (globalThis as any).mockArticlesFindBySlug
          ? (globalThis as any).mockArticlesFindBySlug(slug, options)
          : Promise.resolve(null);
      }
      exists(id: string) {
        return (globalThis as any).mockArticlesExists
          ? (globalThis as any).mockArticlesExists(id)
          : Promise.resolve(false);
      }
      existsBySlug(slug: string) {
        return (globalThis as any).mockArticlesExistsBySlug
          ? (globalThis as any).mockArticlesExistsBySlug(slug)
          : Promise.resolve(false);
      }
      save(article: any, tx?: any) {
        return (globalThis as any).mockArticlesSave
          ? (globalThis as any).mockArticlesSave(article, tx)
          : Promise.resolve();
      }
      update(article: any, tx?: any) {
        return (globalThis as any).mockArticlesUpdate
          ? (globalThis as any).mockArticlesUpdate(article, tx)
          : Promise.resolve();
      }
      softDelete(id: string, tx?: any) {
        return (globalThis as any).mockArticlesSoftDelete
          ? (globalThis as any).mockArticlesSoftDelete(id, tx)
          : Promise.resolve();
      }
      search(filter: any, pagination: any, sort: any) {
        return (globalThis as any).mockArticlesSearch
          ? (globalThis as any).mockArticlesSearch(filter, pagination, sort)
          : Promise.resolve({ items: [], total: 0 });
      }
      incrementViewCount(id: string) {
        return (globalThis as any).mockArticlesIncrementViewCount
          ? (globalThis as any).mockArticlesIncrementViewCount(id)
          : Promise.resolve();
      }
      addTagsToArticle(id: string, tagIds: string[], tx?: any) {
        return (globalThis as any).mockArticlesAddTags
          ? (globalThis as any).mockArticlesAddTags(id, tagIds, tx)
          : Promise.resolve();
      }
      removeTagsFromArticle(id: string, tagIds: string[], tx?: any) {
        return (globalThis as any).mockArticlesRemoveTags
          ? (globalThis as any).mockArticlesRemoveTags(id, tagIds, tx)
          : Promise.resolve();
      }
      replaceTagsOfArticle(id: string, tagIds: string[], tx?: any) {
        return (globalThis as any).mockArticlesReplaceTags
          ? (globalThis as any).mockArticlesReplaceTags(id, tagIds, tx)
          : Promise.resolve();
      }
    },
  };
});

import { expect, test, describe, beforeEach } from 'bun:test';
import type { Hono } from 'hono';
import { Category } from '../domain/category.entity';

describe('Categories API Routing & Controller', () => {
  let app: Hono;

  const mockFindById = mock((_id: string) => Promise.resolve<Category | null>(null));
  const mockFindByCode = mock((_code: string) => Promise.resolve<Category | null>(null));
  const mockFindAll = mock(() => Promise.resolve<Category[]>([]));
  const mockExists = mock((_id: string) => Promise.resolve<boolean>(false));
  const mockExistsByCode = mock((_code: string) => Promise.resolve<boolean>(false));
  const mockSave = mock((_category: Category) => Promise.resolve());
  const mockUpdate = mock((_category: Category) => Promise.resolve());
  const mockDelete = mock((_id: string) => Promise.resolve());

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindById.mockClear();
    mockFindByCode.mockClear();
    mockFindAll.mockClear();
    mockExists.mockClear();
    mockExistsByCode.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();

    (globalThis as any).mockCategoriesFindById = mockFindById;
    (globalThis as any).mockCategoriesFindByCode = mockFindByCode;
    (globalThis as any).mockCategoriesFindAll = mockFindAll;
    (globalThis as any).mockCategoriesExists = mockExists;
    (globalThis as any).mockCategoriesExistsByCode = mockExistsByCode;
    (globalThis as any).mockCategoriesSave = mockSave;
    (globalThis as any).mockCategoriesUpdate = mockUpdate;
    (globalThis as any).mockCategoriesDelete = mockDelete;
  });

  const categoryId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const categoryCode = 'cam-nang';
  const categoryName = 'Cẩm nang du lịch';
  const categoryDesc = 'Các bài viết chia sẻ kinh nghiệm du lịch Hoàng Su Phì.';

  const sampleCategory = Category.create(
    categoryId,
    categoryCode,
    categoryName,
    categoryDesc,
    new Date()
  );

  describe('GET /api/v1/categories', () => {
    test('should return empty list when no categories exist', async () => {
      mockFindAll.mockImplementation(() => Promise.resolve([]));
      const res = await app.request('/api/v1/categories');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
    });

    test('should return category list successfully', async () => {
      mockFindAll.mockImplementation(() => Promise.resolve([sampleCategory]));
      const res = await app.request('/api/v1/categories');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(categoryId);
      expect(body.data[0].code).toBe(categoryCode);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    test('should return 400 for invalid UUID', async () => {
      const res = await app.request('/api/v1/categories/invalid-uuid');
      expect(res.status).toBe(400);
    });

    test('should return 404 if category not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/categories/${categoryId}`);
      expect(res.status).toBe(404);
    });

    test('should return category details successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleCategory));
      const res = await app.request(`/api/v1/categories/${categoryId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(categoryId);
      expect(body.code).toBe(categoryCode);
    });
  });

  describe('GET /api/v1/categories/code/:code', () => {
    test('should return 400 for invalid category code format', async () => {
      const res = await app.request('/api/v1/categories/code/INVALID_CODE');
      expect(res.status).toBe(400);
    });

    test('should return 404 if category code not found', async () => {
      mockFindByCode.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/categories/code/${categoryCode}`);
      expect(res.status).toBe(404);
    });

    test('should return category details successfully by code', async () => {
      mockFindByCode.mockImplementation(() => Promise.resolve(sampleCategory));
      const res = await app.request(`/api/v1/categories/code/${categoryCode}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(categoryCode);
    });
  });

  describe('POST /api/v1/categories', () => {
    test('should return 401 if unauthorized', async () => {
      const res = await app.request('/api/v1/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'new-cat',
          name: 'New Category',
        }),
      });
      expect(res.status).toBe(401);
    });

    test('should return 400 if input validation fails', async () => {
      const res = await app.request('/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          code: '',
          name: '',
        }),
      });
      expect(res.status).toBe(400);
    });

    test('should return 409 if category code already exists', async () => {
      mockExistsByCode.mockImplementation(() => Promise.resolve(true));
      const res = await app.request('/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          code: 'cam-nang',
          name: 'Cẩm nang',
        }),
      });
      expect(res.status).toBe(409);
    });

    test('should create category successfully', async () => {
      mockExistsByCode.mockImplementation(() => Promise.resolve(false));
      mockSave.mockImplementation(() => Promise.resolve());

      const res = await app.request('/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          code: 'new-cat',
          name: 'New Category',
          description: 'Desc',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBe('new-cat');
      expect(body.name).toBe('New Category');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    test('should return 404 if category to update is not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });
      expect(res.status).toBe(404);
    });

    test('should update category successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleCategory));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'Updated Category Name',
          description: 'Updated description',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Updated Category Name');
      expect(body.description).toBe('Updated description');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    test('should return 404 if category to delete is not found', async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const res = await app.request(`/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });
      expect(res.status).toBe(404);
    });

    test('should delete category successfully', async () => {
      mockExists.mockImplementation(() => Promise.resolve(true));
      mockDelete.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(204);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
