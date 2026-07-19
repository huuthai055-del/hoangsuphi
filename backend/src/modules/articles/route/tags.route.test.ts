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

import { beforeEach, describe, expect, test } from 'bun:test';
import type { Hono } from 'hono';
import { Tag } from '../domain/tag.entity';

describe('Tags API Routing & Controller', () => {
  let app: Hono;

  const mockFindById = mock((_id: string) => Promise.resolve<Tag | null>(null));
  const mockFindBySlug = mock((_slug: string) => Promise.resolve<Tag | null>(null));
  const mockFindAll = mock((_options?: any) => Promise.resolve<Tag[]>([]));
  const mockExists = mock((_id: string) => Promise.resolve<boolean>(false));
  const mockExistsBySlug = mock((_slug: string) => Promise.resolve<boolean>(false));
  const mockSave = mock((_tag: Tag) => Promise.resolve());
  const mockUpdate = mock((_tag: Tag) => Promise.resolve());
  const mockDelete = mock((_id: string) => Promise.resolve());

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindById.mockClear();
    mockFindBySlug.mockClear();
    mockFindAll.mockClear();
    mockExists.mockClear();
    mockExistsBySlug.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();

    (globalThis as any).mockTagsFindById = mockFindById;
    (globalThis as any).mockTagsFindBySlug = mockFindBySlug;
    (globalThis as any).mockTagsFindAll = mockFindAll;
    (globalThis as any).mockTagsExists = mockExists;
    (globalThis as any).mockTagsExistsBySlug = mockExistsBySlug;
    (globalThis as any).mockTagsSave = mockSave;
    (globalThis as any).mockTagsUpdate = mockUpdate;
    (globalThis as any).mockTagsDelete = mockDelete;
  });

  const tagId = '019f4bc4-f550-7d52-bba4-3b6258b55702';
  const tagSlug = 'ruong-bac-thang';
  const tagName = 'Ruộng bậc thang';
  const tagDesc = 'Thẻ dành cho các bài viết về ruộng bậc thang Hoang Su Phi.';

  const sampleTag = Tag.create(tagId, tagName, tagSlug, tagDesc, true, new Date());

  describe('GET /api/v1/tags', () => {
    test('should return list of tags', async () => {
      mockFindAll.mockImplementation(() => Promise.resolve([sampleTag]));
      const res = await app.request('/api/v1/tags?isFeatured=true');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(tagId);
    });

    test('should return 400 for invalid query format', async () => {
      const res = await app.request('/api/v1/tags?isFeatured=invalid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/tags/search', () => {
    test('should search tags successfully', async () => {
      mockFindAll.mockImplementation(() => Promise.resolve([sampleTag]));
      const res = await app.request('/api/v1/tags/search?q=ruong');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tags/:id', () => {
    test('should return 400 for invalid UUID', async () => {
      const res = await app.request('/api/v1/tags/invalid-uuid');
      expect(res.status).toBe(400);
    });

    test('should return 404 if tag not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/tags/${tagId}`);
      expect(res.status).toBe(404);
    });

    test('should return tag details successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleTag));
      const res = await app.request(`/api/v1/tags/${tagId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(tagId);
      expect(body.name).toBe(tagName);
    });
  });

  describe('GET /api/v1/tags/slug/:slug', () => {
    test('should return 404 if slug not found', async () => {
      mockFindBySlug.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/tags/slug/${tagSlug}`);
      expect(res.status).toBe(404);
    });

    test('should return tag details successfully by slug', async () => {
      mockFindBySlug.mockImplementation(() => Promise.resolve(sampleTag));
      const res = await app.request(`/api/v1/tags/slug/${tagSlug}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe(tagSlug);
    });
  });

  describe('POST /api/v1/tags', () => {
    test('should return 401 if unauthorized', async () => {
      const res = await app.request('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Tag',
        }),
      });
      expect(res.status).toBe(401);
    });

    test('should create tag successfully', async () => {
      mockExistsBySlug.mockImplementation(() => Promise.resolve(false));
      mockSave.mockImplementation(() => Promise.resolve());

      const res = await app.request('/api/v1/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'New Tag',
          slug: 'new-tag',
          description: 'Tag description',
          isFeatured: true,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('New Tag');
      expect(body.slug).toBe('new-tag');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/tags/:id', () => {
    test('should update tag successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleTag));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/tags/${tagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'Updated Tag Name',
          isFeatured: false,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Updated Tag Name');
      expect(body.isFeatured).toBe(false);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/tags/:id', () => {
    test('should delete tag successfully', async () => {
      mockExists.mockImplementation(() => Promise.resolve(true));
      mockDelete.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/tags/${tagId}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(204);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
