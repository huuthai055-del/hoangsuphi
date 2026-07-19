import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/common/errors/http.errors';
import { slugify } from '@/common/utils/slug';
import { generateUuidV7 } from '@/common/utils/uuid';
import { runInTransaction } from '@/lib/database/client';
import { ArticleDomainError } from '../domain/article-errors';
import { Article } from '../domain/article.entity';
import type {
  IArticlesRepository,
  PaginatedResult,
  PaginationOptions,
  SearchArticlesFilter,
  SortOptions,
} from '../repository/articles-repository.interface';
import type { ICategoriesRepository } from '../repository/categories-repository.interface';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '../repository/repository-errors';
import type { ITagsRepository } from '../repository/tags-repository.interface';
import type { IClock, ILogger } from './interfaces';

export interface CreateArticleCommand {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  thumbnailId?: string | null;
  authorId: string;
  categoryId: string;
  tagIds?: string[];
}

export interface UpdateArticleCommand {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  thumbnailId?: string | null;
  categoryId?: string;
  tagIds?: string[];
  isFeatured?: boolean;
}

export class ArticlesService {
  constructor(
    private readonly articlesRepo: IArticlesRepository,
    private readonly categoriesRepo: ICategoriesRepository,
    private readonly tagsRepo: ITagsRepository,
    private readonly logger: ILogger,
    private readonly clock: IClock
  ) {}

  private async executeWithLogging<T>(
    action: string,
    context: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const executionTime = Math.round(performance.now() - startTime);
      this.logger.info(
        {
          ...context,
          executionTime,
          action,
        },
        `Article action ${action} completed successfully`
      );
      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      this.logger.error(
        {
          ...context,
          executionTime,
          action,
          error: error instanceof Error ? error.message : String(error),
        },
        `Article action ${action} failed`
      );
      throw error;
    }
  }

  private mapDomainError(err: unknown): never {
    if (err instanceof ArticleDomainError) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  private runDomain<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      this.mapDomainError(err);
    }
  }

  private ensureNotArchived(
    article: Article,
    message = 'Cannot perform operation on an archived article'
  ): void {
    if (article.status === 'archived') {
      throw new ValidationError(message);
    }
  }

  private assertAccess(article: Article, caller: { id: string; roles: string[] }): void {
    const roles = caller.roles || [];
    if (article.authorId !== caller.id && !roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to modify this article');
    }
  }

  public async getArticleById(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Article> {
    const article = await this.articlesRepo.findById(id, options);
    if (!article) {
      throw new NotFoundError(`Article not found with ID: ${id}`);
    }
    return article;
  }

  public async getArticleBySlug(
    slug: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Article> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const article = await this.articlesRepo.findBySlug(cleanSlug, options);
    if (!article) {
      throw new NotFoundError(`Article not found with slug: ${cleanSlug}`);
    }
    return article;
  }

  public async searchArticles(
    filter: SearchArticlesFilter,
    pagination: PaginationOptions,
    sort: SortOptions
  ): Promise<PaginatedResult<Article>> {
    return this.articlesRepo.search(filter, pagination, sort);
  }

  public async createArticle(command: CreateArticleCommand): Promise<Article> {
    return this.executeWithLogging(
      'create_article',
      { title: command.title, slug: command.slug },
      async () => {
        // 1. Tạo thực thể Domain trước để tự bảo vệ invariants (không duplicate validation ở Service)
        const id = command.id ?? generateUuidV7();
        const slug =
          command.slug !== undefined && command.slug !== null
            ? command.slug.trim()
            : slugify(command.title || '');

        const article = this.runDomain(() =>
          Article.create(
            id,
            command.title,
            slug,
            command.excerpt,
            command.content,
            command.categoryId,
            command.authorId,
            command.thumbnailId ?? null,
            this.clock.now()
          )
        );

        // 2. Kiểm tra Business Constraints dựa trên thực thể hợp lệ đã khởi tạo
        const categoryExists = await this.categoriesRepo.exists(article.categoryId);
        if (!categoryExists) {
          throw new NotFoundError(`Category not found with ID: ${article.categoryId}`);
        }

        if (article.slug) {
          const slugExists = await this.articlesRepo.existsBySlug(article.slug);
          if (slugExists) {
            throw new ConflictError(`Article slug already exists: ${article.slug}`);
          }
        }

        if (command.tagIds && command.tagIds.length > 0) {
          const uniqueTagIds = [...new Set(command.tagIds)];
          const foundTags = await this.tagsRepo.findByIds(uniqueTagIds);
          if (foundTags.length !== uniqueTagIds.length) {
            throw new ValidationError('One or more associated tags do not exist');
          }
        }

        return runInTransaction(async (tx) => {
          try {
            await this.articlesRepo.save(article, tx);
          } catch (err) {
            if (err instanceof DuplicateKeyRepositoryError) {
              throw new ConflictError(`Article slug already exists: ${slug}`);
            }
            throw err;
          }

          if (command.tagIds && command.tagIds.length > 0) {
            const uniqueTagIds = [...new Set(command.tagIds)];
            await this.articlesRepo.addTagsToArticle(id, uniqueTagIds, tx);
          }

          return article;
        });
      }
    );
  }

  public async updateArticle(
    id: string,
    command: UpdateArticleCommand,
    caller: { id: string; roles: string[] }
  ): Promise<Article> {
    return this.executeWithLogging('update_article', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: true });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.assertAccess(article, caller);

      if (article.deletedAt) {
        throw new ValidationError('Cannot update a deleted article');
      }

      // Rule: Chặn sửa bài viết ở trạng thái archived
      this.ensureNotArchived(article, 'Cannot update an archived article');

      // 1. Xác thực các ràng buộc bên ngoài (External Constraints) trước khi mutate Domain
      if (command.categoryId !== undefined && command.categoryId !== article.categoryId) {
        const categoryExists = await this.categoriesRepo.exists(command.categoryId);
        if (!categoryExists) {
          throw new NotFoundError(`Category not found with ID: ${command.categoryId}`);
        }
      }

      let newSlug = article.slug;
      if (command.title !== undefined || command.slug !== undefined) {
        const newTitle = command.title !== undefined ? command.title : article.title;
        newSlug = command.slug !== undefined ? command.slug : slugify(newTitle);

        if (newSlug !== article.slug) {
          const slugExists = await this.articlesRepo.existsBySlug(newSlug);
          if (slugExists) {
            throw new ConflictError(`Article slug already exists: ${newSlug}`);
          }
        }
      }

      // 2. Thực hiện các mutation của Domain (để Domain tự validate invariants)
      this.runDomain(() => {
        if (command.categoryId !== undefined && command.categoryId !== article.categoryId) {
          article.changeCategory(command.categoryId, this.clock.now());
        }

        if (command.title !== undefined || command.slug !== undefined) {
          const newTitle = command.title !== undefined ? command.title : article.title;
          article.changeTitle(newTitle, newSlug, this.clock.now());
        }

        if (command.excerpt !== undefined) {
          article.changeExcerpt(command.excerpt, this.clock.now());
        }

        if (command.content !== undefined) {
          article.changeContent(command.content, this.clock.now());
        }

        if (command.thumbnailId !== undefined) {
          article.changeThumbnail(command.thumbnailId, this.clock.now());
        }

        if (command.isFeatured !== undefined) {
          if (command.isFeatured) {
            article.feature(this.clock.now());
          } else {
            article.unfeature(this.clock.now());
          }
        }
      });

      return runInTransaction(async (tx) => {
        if (command.tagIds !== undefined) {
          const uniqueTagIds = [...new Set(command.tagIds)];
          if (uniqueTagIds.length > 0) {
            const foundTags = await this.tagsRepo.findByIds(uniqueTagIds);
            if (foundTags.length !== uniqueTagIds.length) {
              throw new ValidationError('One or more associated tags do not exist');
            }
          }
          await this.articlesRepo.replaceTagsOfArticle(id, uniqueTagIds, tx);
        }

        try {
          await this.articlesRepo.update(article, tx);
        } catch (err) {
          if (err instanceof DuplicateKeyRepositoryError) {
            throw new ConflictError('Article slug already exists');
          }
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }

        return article;
      });
    });
  }

  public async submitReview(id: string, caller: { id: string; roles: string[] }): Promise<Article> {
    return this.executeWithLogging('submit_review', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: false });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.assertAccess(article, caller);

      this.ensureNotArchived(article);

      this.runDomain(() => article.submitForReview(this.clock.now()));

      return runInTransaction(async (tx) => {
        try {
          await this.articlesRepo.update(article, tx);
        } catch (err) {
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }
        return article;
      });
    });
  }

  public async publishArticle(id: string): Promise<Article> {
    return this.executeWithLogging('publish_article', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: false });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.ensureNotArchived(article);

      this.runDomain(() => article.publish(this.clock.now()));

      return runInTransaction(async (tx) => {
        try {
          await this.articlesRepo.update(article, tx);
        } catch (err) {
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }
        return article;
      });
    });
  }

  public async rejectArticle(id: string, reason?: string): Promise<Article> {
    return this.executeWithLogging(
      'reject_review',
      { articleId: id, reason: reason ?? '' },
      async () => {
        const article = await this.articlesRepo.findById(id, { includeDeleted: false });
        if (!article) {
          throw new NotFoundError(`Article not found with ID: ${id}`);
        }

        this.ensureNotArchived(article);

        this.runDomain(() => article.rejectReview(this.clock.now()));

        return runInTransaction(async (tx) => {
          try {
            await this.articlesRepo.update(article, tx);
          } catch (err) {
            if (err instanceof EntityNotFoundRepositoryError) {
              throw new NotFoundError(`Article not found with ID: ${id}`);
            }
            throw err;
          }
          return article;
        });
      }
    );
  }

  public async archiveArticle(
    id: string,
    caller: { id: string; roles: string[] }
  ): Promise<Article> {
    return this.executeWithLogging('archive_article', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: false });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.assertAccess(article, caller);

      // Rule: Chỉ bài viết published mới được archive (bao gồm chặn cả draft và under_review)
      if (article.status !== 'published') {
        throw new ValidationError(`Cannot archive article from ${article.status} status`);
      }

      this.runDomain(() => article.archive(this.clock.now()));

      return runInTransaction(async (tx) => {
        try {
          await this.articlesRepo.update(article, tx);
        } catch (err) {
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }
        return article;
      });
    });
  }

  public async recordView(id: string): Promise<void> {
    await this.executeWithLogging('record_view', { articleId: id }, async () => {
      try {
        await this.articlesRepo.incrementViewCount(id);
      } catch (err) {
        if (err instanceof EntityNotFoundRepositoryError) {
          throw new NotFoundError(`Article not found with ID: ${id}`);
        }
        throw err;
      }
    });
  }

  public async deleteArticle(id: string, caller: { id: string; roles: string[] }): Promise<void> {
    await this.executeWithLogging('delete_article', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: true });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.assertAccess(article, caller);
      if (article.deletedAt) {
        throw new ValidationError('Article is already deleted');
      }

      return runInTransaction(async (tx) => {
        try {
          await this.articlesRepo.softDelete(id, tx);
        } catch (err) {
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }
      });
    });
  }

  public async restoreArticle(
    id: string,
    caller: { id: string; roles: string[] }
  ): Promise<Article> {
    return this.executeWithLogging('restore_article', { articleId: id }, async () => {
      const article = await this.articlesRepo.findById(id, { includeDeleted: true });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${id}`);
      }

      this.assertAccess(article, caller);
      if (!article.deletedAt) {
        throw new ValidationError('Article is not deleted');
      }

      article.restore(this.clock.now());

      return runInTransaction(async (tx) => {
        try {
          // articlesRepo.update đã persist deletedAt = null và đồng bộ đầy đủ các thuộc tính khác.
          await this.articlesRepo.update(article, tx);
        } catch (err) {
          if (err instanceof EntityNotFoundRepositoryError) {
            throw new NotFoundError(`Article not found with ID: ${id}`);
          }
          throw err;
        }
        return article;
      });
    });
  }

  public async bindTags(
    articleId: string,
    tagIds: string[],
    caller: { id: string; roles: string[] }
  ): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    const uniqueTagIds = [...new Set(tagIds)];

    await this.executeWithLogging('bind_tags', { articleId, tagIds: uniqueTagIds }, async () => {
      const article = await this.articlesRepo.findById(articleId, { includeDeleted: false });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${articleId}`);
      }

      this.assertAccess(article, caller);

      this.ensureNotArchived(article);

      const foundTags = await this.tagsRepo.findByIds(uniqueTagIds);
      if (foundTags.length !== uniqueTagIds.length) {
        throw new ValidationError('One or more associated tags do not exist');
      }

      return runInTransaction(async (tx) => {
        await this.articlesRepo.addTagsToArticle(articleId, uniqueTagIds, tx);
      });
    });
  }

  public async removeTags(
    articleId: string,
    tagIds: string[],
    caller: { id: string; roles: string[] }
  ): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    const uniqueTagIds = [...new Set(tagIds)];

    await this.executeWithLogging('remove_tags', { articleId, tagIds: uniqueTagIds }, async () => {
      const article = await this.articlesRepo.findById(articleId, { includeDeleted: false });
      if (!article) {
        throw new NotFoundError(`Article not found with ID: ${articleId}`);
      }

      this.assertAccess(article, caller);

      this.ensureNotArchived(article);

      return runInTransaction(async (tx) => {
        await this.articlesRepo.removeTagsFromArticle(articleId, uniqueTagIds, tx);
      });
    });
  }
}
