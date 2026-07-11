import { Article, type ArticleStatus } from '../domain/article.entity';

export interface RawArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailId: string | null;
  authorId: string;
  categoryId: string;
  viewCount: number;
  isFeatured: boolean;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const ArticleMapper = {
  toDomain(raw: RawArticle): Article {
    return Article.rehydrate({
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      excerpt: raw.excerpt,
      content: raw.content,
      thumbnailId: raw.thumbnailId,
      authorId: raw.authorId,
      categoryId: raw.categoryId,
      status: raw.status as ArticleStatus,
      viewCount: raw.viewCount,
      isFeatured: raw.isFeatured,
      publishedAt: raw.publishedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(article: Article): RawArticle {
    const props = article.toPersistence();
    return {
      id: props.id,
      title: props.title,
      slug: props.slug,
      excerpt: props.excerpt,
      content: props.content,
      thumbnailId: props.thumbnailId,
      authorId: props.authorId,
      categoryId: props.categoryId,
      status: props.status,
      viewCount: props.viewCount,
      isFeatured: props.isFeatured,
      publishedAt: props.publishedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    };
  },
};
