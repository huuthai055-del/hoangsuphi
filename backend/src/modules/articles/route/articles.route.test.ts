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

import { expect, test, describe, beforeEach } from 'bun:test';
import type { Hono } from 'hono';
import { Article } from '../domain/article.entity';
import { Tag } from '../domain/tag.entity';

describe('Articles API Routing & Controller', () => {
  let app: Hono;

  // Categories Mocks (Required to resolve references)
  const mockCatExists = mock((_id: string) => Promise.resolve<boolean>(false));

  // Tags Mocks
  const mockTagsFindByIds = mock((_ids: string[]) => Promise.resolve<Tag[]>([]));

  // Articles Mocks
  const mockFindById = mock((_id: string, _options?: any) => Promise.resolve<Article | null>(null));
  const mockFindBySlug = mock((_slug: string, _options?: any) => Promise.resolve<Article | null>(null));
  const mockExists = mock((_id: string) => Promise.resolve<boolean>(false));
  const mockExistsBySlug = mock((_slug: string) => Promise.resolve<boolean>(false));
  const mockSave = mock((_article: Article, _tx?: any) => Promise.resolve());
  const mockUpdate = mock((_article: Article, _tx?: any) => Promise.resolve());
  const mockSoftDelete = mock((_id: string, _tx?: any) => Promise.resolve());
  const mockSearch = mock(
    (_filter: any, _pagination: any, _sort: any) =>
      Promise.resolve<{ items: Article[]; total: number }>({ items: [], total: 0 })
  );
  const mockIncrementViewCount = mock((_id: string) => Promise.resolve());
  const mockAddTags = mock((_id: string, _tagIds: string[], _tx?: any) => Promise.resolve());
  const mockRemoveTags = mock((_id: string, _tagIds: string[], _tx?: any) => Promise.resolve());
  const mockReplaceTags = mock((_id: string, _tagIds: string[], _tx?: any) => Promise.resolve());

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    // Clear Mocks
    mockCatExists.mockClear();
    mockTagsFindByIds.mockClear();
    mockFindById.mockClear();
    mockFindBySlug.mockClear();
    mockExists.mockClear();
    mockExistsBySlug.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockSoftDelete.mockClear();
    mockSearch.mockClear();
    mockIncrementViewCount.mockClear();
    mockAddTags.mockClear();
    mockRemoveTags.mockClear();
    mockReplaceTags.mockClear();

    // Assign Mocks
    (globalThis as any).mockCategoriesExists = mockCatExists;
    (globalThis as any).mockTagsFindByIds = mockTagsFindByIds;
    (globalThis as any).mockArticlesFindById = mockFindById;
    (globalThis as any).mockArticlesFindBySlug = mockFindBySlug;
    (globalThis as any).mockArticlesExists = mockExists;
    (globalThis as any).mockArticlesExistsBySlug = mockExistsBySlug;
    (globalThis as any).mockArticlesSave = mockSave;
    (globalThis as any).mockArticlesUpdate = mockUpdate;
    (globalThis as any).mockArticlesSoftDelete = mockSoftDelete;
    (globalThis as any).mockArticlesSearch = mockSearch;
    (globalThis as any).mockArticlesIncrementViewCount = mockIncrementViewCount;
    (globalThis as any).mockArticlesAddTags = mockAddTags;
    (globalThis as any).mockArticlesRemoveTags = mockRemoveTags;
    (globalThis as any).mockArticlesReplaceTags = mockReplaceTags;
  });

  const categoryId = '019f4bc4-f550-7d52-bba4-3b6258b55701';
  const tagId = '019f4bc4-f550-7d52-bba4-3b6258b55702';
  const tagSlug = 'ruong-bac-thang';
  const tagName = 'Ruộng bậc thang';
  const tagDesc = 'Thẻ dành cho các bài viết về ruộng bậc thang Hoang Su Phi.';

  const sampleTag = Tag.create(
    tagId,
    tagName,
    tagSlug,
    tagDesc,
    true,
    new Date()
  );

  const articleId = '019f4bc4-f550-7d52-bba4-3b6258b55703';
  const authorId = '00000000-0000-0000-0000-000000000001';
  const title = 'Kinh nghiệm phượt Hoàng Su Phì bằng xe máy';
  const slug = 'kinh-nghiem-phuot-hoang-su-phi-bang-xe-may';
  const excerpt = 'Cẩm nang hướng dẫn đầy đủ đường đi, thời tiết.';
  const content = 'Chi tiết lộ trình đi Bản Phùng, Bản Luốc...';

  const sampleArticle = Article.create(
    articleId,
    title,
    slug,
    excerpt,
    content,
    categoryId,
    authorId,
    null,
    new Date()
  );

  describe('GET /api/v1/articles', () => {
    test('should search and return paginated list of articles', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ items: [sampleArticle], total: 1 }));
      const res = await app.request('/api/v1/articles?page=1&limit=20');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    });

    test('should search with custom sort and order parameters successfully', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ items: [sampleArticle], total: 1 }));
      const res = await app.request('/api/v1/articles?page=1&limit=20&sort=title&order=asc');
      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(Object),
        { page: 1, pageSize: 20 },
        { field: 'title', order: 'ASC' }
      );
    });
  });

  describe('GET /api/v1/articles/:id', () => {
    test('should return 400 for invalid UUID', async () => {
      const res = await app.request('/api/v1/articles/invalid-uuid');
      expect(res.status).toBe(400);
    });

    test('should return 404 if article not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/articles/${articleId}`);
      expect(res.status).toBe(404);
    });

    test('should return article details successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      const res = await app.request(`/api/v1/articles/${articleId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(articleId);
    });
  });

  describe('GET /api/v1/articles/slug/:slug', () => {
    test('should return 404 if slug not found', async () => {
      mockFindBySlug.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/articles/slug/${slug}`);
      expect(res.status).toBe(404);
    });

    test('should return article details successfully by slug', async () => {
      mockFindBySlug.mockImplementation(() => Promise.resolve(sampleArticle));
      const res = await app.request(`/api/v1/articles/slug/${slug}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe(slug);
    });
  });

  describe('POST /api/v1/articles', () => {
    test('should return 401 if unauthorized', async () => {
      const res = await app.request('/api/v1/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Article',
          excerpt: 'Excerpt',
          content: 'Content',
          categoryId,
        }),
      });
      expect(res.status).toBe(401);
    });

    test('should return 400 if input validation fails', async () => {
      const res = await app.request('/api/v1/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: '',
          categoryId: 'invalid-uuid',
        }),
      });
      expect(res.status).toBe(400);
    });

    test('should create article successfully', async () => {
      mockCatExists.mockImplementation(() => Promise.resolve(true));
      mockExistsBySlug.mockImplementation(() => Promise.resolve(false));
      mockSave.mockImplementation(() => Promise.resolve());

      const res = await app.request('/api/v1/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'New Article Title',
          slug: 'new-article-slug',
          excerpt: 'Excerpt here',
          content: 'Content here',
          categoryId,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe('New Article Title');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/articles/:id', () => {
    test('should return 404 if article to update is not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/articles/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });
      expect(res.status).toBe(404);
    });

    test('should update article successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'Updated Article Title',
          excerpt: 'Updated excerpt',
          isFeatured: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Updated Article Title');
      expect(body.isFeatured).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/articles/:id', () => {
    test('should return 404 if article to delete is not found', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));
      const res = await app.request(`/api/v1/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });
      expect(res.status).toBe(404);
    });

    test('should soft delete article successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      mockSoftDelete.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(204);
      expect(mockSoftDelete).toHaveBeenCalled();
    });
  });

  describe('Workflow State Transitions', () => {
    test('POST /:id/submit - should transition to under_review successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('under_review');
    });

    test('POST /:id/publish - should publish article successfully', async () => {
      const underReviewArticle = Article.rehydrate({
        ...sampleArticle.toPersistence(),
        status: 'under_review',
      });
      mockFindById.mockImplementation(() => Promise.resolve(underReviewArticle));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('published');
    });

    test('POST /:id/reject - should reject review and return to draft', async () => {
      const underReviewArticle = Article.rehydrate({
        ...sampleArticle.toPersistence(),
        status: 'under_review',
      });
      mockFindById.mockImplementation(() => Promise.resolve(underReviewArticle));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ reason: 'Contains spelling errors' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('draft');
    });

    test('POST /:id/archive - should archive article successfully', async () => {
      const publishedArticle = Article.rehydrate({
        ...sampleArticle.toPersistence(),
        status: 'published',
      });
      mockFindById.mockImplementation(() => Promise.resolve(publishedArticle));
      mockUpdate.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('archived');
    });
  });

  describe('Tag Bindings', () => {
    test('POST /:id/tags - should bind tags successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      mockTagsFindByIds.mockImplementation(() => Promise.resolve([sampleTag]));
      mockAddTags.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ tagIds: [tagId] }),
      });

      expect(res.status).toBe(204);
    });

    test('DELETE /:id/tags - should unbind tags successfully', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(sampleArticle));
      mockRemoveTags.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/articles/${articleId}/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ tagIds: [tagId] }),
      });

      expect(res.status).toBe(204);
    });
  });

  describe('Views counter', () => {
    test('POST /:id/views - should increment views counter', async () => {
      mockIncrementViewCount.mockImplementation(() => Promise.resolve());
      const res = await app.request(`/api/v1/articles/${articleId}/views`, {
        method: 'POST',
      });
      expect(res.status).toBe(204);
      expect(mockIncrementViewCount).toHaveBeenCalled();
    });
  });
});
