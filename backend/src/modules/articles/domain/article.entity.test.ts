import { describe, test, expect } from 'bun:test';
import { Article } from './article.entity';
import { ArticleDomainError } from './article-errors';

describe('Article Domain Entity', () => {
  const id = '019f4bc4-f550-7d52-bba4-3b6258b55703';
  const title = 'Kinh nghiệm du lịch Hoàng Su Phì tự túc';
  const slug = 'kinh-nghiem-du-lich-hoang-su-phi-tu-tuc';
  const excerpt = 'Cẩm nang trekking ruộng bậc thang và săn mây Chiêu Lầu Thi.';
  const content = 'Nội dung bài viết chi tiết ở đây...';
  const authorId = '019f4bc4-f550-7d52-bba4-3b6258b55704';
  const categoryId = '019f4bc4-f550-7d52-bba4-3b6258b55705';
  const thumbnailId = '019f4bc4-f550-7d52-bba4-3b6258b55706';

  test('should create a valid article', () => {
    const article = Article.create(id, title, slug, excerpt, content, categoryId, authorId, thumbnailId);
    expect(article.id).toBe(id);
    expect(article.title).toBe(title);
    expect(article.slug).toBe(slug);
    expect(article.status).toBe('draft');
    expect(article.viewCount).toBe(0);
  });

  test('should validate input constraints upon creation', () => {
    expect(() => Article.create('', title, slug, excerpt, content, categoryId, authorId)).toThrow(ArticleDomainError);
    expect(() => Article.create(id, '', slug, excerpt, content, categoryId, authorId)).toThrow(ArticleDomainError);
    expect(() => Article.create(id, title, 'invalid slug!', excerpt, content, categoryId, authorId)).toThrow(ArticleDomainError);
  });

  test('should update article details', () => {
    const article = Article.create(id, title, slug, excerpt, content, categoryId, authorId);
    article.update('New Title', 'New Excerpt', 'New Content', categoryId, 'new-thumb');
    expect(article.title).toBe('New Title');
    expect(article.excerpt).toBe('New Excerpt');
    expect(article.content).toBe('New Content');
    expect(article.thumbnailId).toBe('new-thumb');
  });

  test('should handle CMS state transition lifecycle', () => {
    const article = Article.create(id, title, slug, excerpt, content, categoryId, authorId);
    article.submitForReview();
    expect(article.status).toBe('under_review');

    article.publish();
    expect(article.status).toBe('published');
    expect(article.publishedAt).toBeInstanceOf(Date);

    article.archive();
    expect(article.status).toBe('archived');
  });
});
