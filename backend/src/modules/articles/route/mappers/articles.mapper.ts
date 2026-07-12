import type { Article } from '../../domain/article.entity';
import type { ArticleResponseDto, ArticleSummaryResponseDto, ArticleListResponseDto } from '../../dto/articles.dto';

export function mapArticleToResponse(article: Article): ArticleResponseDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    thumbnailId: article.thumbnailId,
    authorId: article.authorId,
    categoryId: article.categoryId,
    status: article.status,
    viewCount: article.viewCount,
    isFeatured: article.isFeatured,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function mapArticleToSummary(article: Article): ArticleSummaryResponseDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    thumbnailId: article.thumbnailId,
    authorId: article.authorId,
    categoryId: article.categoryId,
    status: article.status,
    viewCount: article.viewCount,
    isFeatured: article.isFeatured,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function mapArticleListToResponse(
  items: Article[],
  total: number,
  page: number,
  limit: number
): ArticleListResponseDto {
  return {
    data: items.map((item) => mapArticleToSummary(item)),
    meta: {
      page,
      limit,
      total,
    },
  };
}
