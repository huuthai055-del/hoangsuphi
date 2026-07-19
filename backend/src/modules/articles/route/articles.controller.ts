import { AuthenticationError } from '@/common/errors/http.errors';
import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';
import type { Context } from 'hono';
import type {
  ArticleIdParamsDto,
  ArticleListResponseDto,
  ArticleSlugParamsDto,
  BindTagsDto,
  CreateArticleRequestDto,
  RejectArticleDto,
  RemoveTagsDto,
  SearchArticlesQueryDto,
  UpdateArticleRequestDto,
} from '../dto/articles.dto';
import type { ArticlesService } from '../service/articles.service';
import { mapArticleListToResponse, mapArticleToResponse } from './mappers/articles.mapper';

export function requireAuthenticatedUser(c: Context): AuthenticatedUser {
  const user = c.get('user');
  if (!user || !user.id) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  public list = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as SearchArticlesQueryDto;

    const result = await this.service.searchArticles(
      {
        keyword: query.keyword,
        status: query.status,
        categoryId: query.categoryId,
        tagId: query.tagId,
        authorId: query.authorId,
        isFeatured: query.isFeatured,
      },
      {
        page: query.page,
        pageSize: query.limit,
      },
      {
        field: query.sort,
        order: query.order === 'asc' ? 'ASC' : 'DESC',
      }
    );

    const response: ArticleListResponseDto = mapArticleListToResponse(
      result.items,
      result.total,
      query.page,
      query.limit
    );

    return c.json(response, 200);
  };

  public getById = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const article = await this.service.getArticleById(params.id);
    return c.json(mapArticleToResponse(article), 200);
  };

  public getBySlug = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleSlugParamsDto;
    const article = await this.service.getArticleBySlug(params.slug);
    return c.json(mapArticleToResponse(article), 200);
  };

  public create = async (c: Context): Promise<Response> => {
    const body = c.get('validBody') as CreateArticleRequestDto;
    const user = requireAuthenticatedUser(c);

    const article = await this.service.createArticle({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      thumbnailId: body.thumbnailId,
      categoryId: body.categoryId,
      tagIds: body.tagIds,
      authorId: user.id,
    });

    return c.json(mapArticleToResponse(article), 201);
  };

  public update = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const body = c.get('validBody') as UpdateArticleRequestDto;
    const user = requireAuthenticatedUser(c);

    const article = await this.service.updateArticle(
      params.id,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        thumbnailId: body.thumbnailId,
        categoryId: body.categoryId,
        tagIds: body.tagIds,
        isFeatured: body.isFeatured,
      },
      user
    );

    return c.json(mapArticleToResponse(article), 200);
  };

  public delete = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const user = requireAuthenticatedUser(c);
    await this.service.deleteArticle(params.id, user);
    return c.body(null, 204);
  };

  public submitReview = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const user = requireAuthenticatedUser(c);
    const article = await this.service.submitReview(params.id, user);
    return c.json(mapArticleToResponse(article), 200);
  };

  public publish = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const article = await this.service.publishArticle(params.id);
    return c.json(mapArticleToResponse(article), 200);
  };

  public reject = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const body = c.get('validBody') as RejectArticleDto;
    const article = await this.service.rejectArticle(params.id, body.reason);
    return c.json(mapArticleToResponse(article), 200);
  };

  public archive = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const user = requireAuthenticatedUser(c);
    const article = await this.service.archiveArticle(params.id, user);
    return c.json(mapArticleToResponse(article), 200);
  };

  public restore = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const user = requireAuthenticatedUser(c);
    const article = await this.service.restoreArticle(params.id, user);
    return c.json(mapArticleToResponse(article), 200);
  };

  public recordView = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    await this.service.recordView(params.id);
    return c.body(null, 204);
  };

  public bindTags = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const body = c.get('validBody') as BindTagsDto;
    const user = requireAuthenticatedUser(c);
    await this.service.bindTags(params.id, body.tagIds, user);
    return c.body(null, 204);
  };

  public removeTags = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as ArticleIdParamsDto;
    const body = c.get('validBody') as RemoveTagsDto;
    const user = requireAuthenticatedUser(c);
    await this.service.removeTags(params.id, body.tagIds, user);
    return c.body(null, 204);
  };
}
