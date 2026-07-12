import { ArticleDomainError } from './article-errors';

const MAX_VIEW_COUNT = 2147483647;
const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ArticleStatus = 'draft' | 'under_review' | 'published' | 'archived';

export interface ArticleProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailId: string | null;
  authorId: string;
  categoryId: string;
  status: ArticleStatus;
  viewCount: number;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Article {
  private _id: string;
  private _title: string;
  private _slug: string;
  private _excerpt: string;
  private _content: string;
  private _thumbnailId: string | null;
  private _authorId: string;
  private _categoryId: string;
  private _status: ArticleStatus;
  private _viewCount: number;
  private _isFeatured: boolean;
  private _publishedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: ArticleProps) {
    this._id = props.id;
    this._title = props.title;
    this._slug = props.slug;
    this._excerpt = props.excerpt;
    this._content = props.content;
    this._thumbnailId = props.thumbnailId;
    this._authorId = props.authorId;
    this._categoryId = props.categoryId;
    this._status = props.status;
    this._viewCount = props.viewCount;
    this._isFeatured = props.isFeatured;
    this._publishedAt = props.publishedAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  // Helper to resolve timestamp
  private static resolveNow(now?: Date): Date {
    return now ?? new Date();
  }

  // Pure Validators
  private static validateId(id: string): void {
    if (!id || id.trim() === '') {
      throw new ArticleDomainError('Article ID is required');
    }
  }

  private static validateTitle(title: string): void {
    const cleanTitle = title?.trim();
    if (!cleanTitle || cleanTitle === '') {
      throw new ArticleDomainError('Article title cannot be blank');
    }
    if (cleanTitle.length > 255) {
      throw new ArticleDomainError('Article title must not exceed 255 characters');
    }
  }

  private static validateSlug(slug: string): void {
    if (!slug || slug.trim() === '') {
      throw new ArticleDomainError('Article slug is required');
    }
    const cleanSlug = slug.trim();
    if (!SEO_SLUG_REGEX.test(cleanSlug)) {
      throw new ArticleDomainError('Article slug must be a valid SEO slug format (lowercase alphanumeric and single dashes, no leading/trailing dashes)');
    }
  }

  private static validateExcerpt(excerpt: string): void {
    const cleanExcerpt = excerpt?.trim();
    if (!cleanExcerpt || cleanExcerpt === '') {
      throw new ArticleDomainError('Article excerpt cannot be blank');
    }
    if (cleanExcerpt.length > 500) {
      throw new ArticleDomainError('Article excerpt must not exceed 500 characters');
    }
  }

  private static validateContent(content: string): void {
    const cleanContent = content?.trim();
    if (!cleanContent || cleanContent === '') {
      throw new ArticleDomainError('Article content cannot be blank');
    }
  }

  private static validateCategoryId(categoryId: string): void {
    if (!categoryId || categoryId.trim() === '') {
      throw new ArticleDomainError('Category ID is required');
    }
  }

  private static validateAuthorId(authorId: string): void {
    if (!authorId || authorId.trim() === '') {
      throw new ArticleDomainError('Author ID is required');
    }
  }

  private static assertRehydration(props: ArticleProps): void {
    Article.validateId(props.id);
    Article.validateTitle(props.title);
    Article.validateSlug(props.slug);
    Article.validateExcerpt(props.excerpt);
    Article.validateContent(props.content);
    Article.validateCategoryId(props.categoryId);
    Article.validateAuthorId(props.authorId);
    if (!props.status) {
      throw new ArticleDomainError('Article status is required for rehydration');
    }
    if (props.viewCount === undefined || props.viewCount < 0) {
      throw new ArticleDomainError('Article view count must be a non-negative number');
    }
    if (!props.createdAt || !props.updatedAt) {
      throw new ArticleDomainError('Missing required timestamps for article rehydration');
    }
  }

  public static create(
    id: string,
    title: string,
    slug: string,
    excerpt: string,
    content: string,
    categoryId: string,
    authorId: string,
    thumbnailId: string | null = null,
    now?: Date
  ): Article {
    Article.validateId(id);
    Article.validateTitle(title);
    Article.validateSlug(slug);
    Article.validateExcerpt(excerpt);
    Article.validateContent(content);
    Article.validateCategoryId(categoryId);
    Article.validateAuthorId(authorId);

    const timestamp = Article.resolveNow(now);

    return new Article({
      id,
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      thumbnailId: thumbnailId?.trim() || null,
      authorId: authorId.trim(),
      categoryId: categoryId.trim(),
      status: 'draft',
      viewCount: 0,
      isFeatured: false,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });
  }

  public static rehydrate(props: ArticleProps): Article {
    Article.assertRehydration(props);
    return new Article({
      id: props.id,
      title: props.title.trim(),
      slug: props.slug.trim(),
      excerpt: props.excerpt.trim(),
      content: props.content.trim(),
      thumbnailId: props.thumbnailId?.trim() || null,
      authorId: props.authorId.trim(),
      categoryId: props.categoryId.trim(),
      status: props.status,
      viewCount: props.viewCount,
      isFeatured: props.isFeatured,
      publishedAt: props.publishedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    });
  }

  // Getters
  public get id(): string { return this._id; }
  public get title(): string { return this._title; }
  public get slug(): string { return this._slug; }
  public get excerpt(): string { return this._excerpt; }
  public get content(): string { return this._content; }
  public get thumbnailId(): string | null { return this._thumbnailId; }
  public get authorId(): string { return this._authorId; }
  public get categoryId(): string { return this._categoryId; }
  public get status(): ArticleStatus { return this._status; }
  public get viewCount(): number { return this._viewCount; }
  public get isFeatured(): boolean { return this._isFeatured; }
  public get publishedAt(): Date | null { return this._publishedAt; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }
  public get deletedAt(): Date | null { return this._deletedAt; }

  // Internal Setters (Mutators without touching updatedAt)
  private setTitleInternal(newTitle: string, newSlug?: string): void {
    Article.validateTitle(newTitle);
    if (newSlug !== undefined) {
      Article.validateSlug(newSlug);
      const cleanSlug = newSlug.trim();
      if (this._status === 'published' && cleanSlug !== this._slug) {
        throw new ArticleDomainError('Article slug is immutable after publish');
      }
      this._slug = cleanSlug;
    }
    this._title = newTitle.trim();
  }

  private setExcerptInternal(newExcerpt: string): void {
    Article.validateExcerpt(newExcerpt);
    this._excerpt = newExcerpt.trim();
  }

  private setContentInternal(newContent: string): void {
    Article.validateContent(newContent);
    this._content = newContent.trim();
  }

  private setCategoryInternal(newCategoryId: string): void {
    Article.validateCategoryId(newCategoryId);
    this._categoryId = newCategoryId.trim();
  }

  private setThumbnailInternal(newThumbnailId: string | null): void {
    this._thumbnailId = newThumbnailId?.trim() || null;
  }

  // Business Methods
  public update(
    title: string,
    excerpt: string,
    content: string,
    categoryId: string,
    thumbnailId: string | null = null,
    now?: Date
  ): void {
    this.ensureNotDeleted();

    const cleanTitle = title.trim();
    const cleanExcerpt = excerpt.trim();
    const cleanContent = content.trim();
    const cleanCategoryId = categoryId.trim();
    const cleanThumbnailId = thumbnailId?.trim() || null;

    // Chống dirty write: nếu không có bất cứ thay đổi nào, bỏ qua cập nhật
    const hasChanges =
      this._title !== cleanTitle ||
      this._excerpt !== cleanExcerpt ||
      this._content !== cleanContent ||
      this._categoryId !== cleanCategoryId ||
      this._thumbnailId !== cleanThumbnailId;

    if (!hasChanges) return;

    const timestamp = Article.resolveNow(now);
    this.setTitleInternal(title);
    this.setExcerptInternal(excerpt);
    this.setContentInternal(content);
    this.setCategoryInternal(categoryId);
    this.setThumbnailInternal(thumbnailId);
    this._updatedAt = timestamp;
  }

  public changeTitle(newTitle: string, newSlug?: string, now?: Date): void {
    this.ensureNotDeleted();
    const cleanTitle = newTitle.trim();
    const cleanSlug = newSlug !== undefined ? newSlug.trim() : undefined;

    const hasChanges = this._title !== cleanTitle || (cleanSlug !== undefined && this._slug !== cleanSlug);
    if (!hasChanges) return;

    this.setTitleInternal(newTitle, newSlug);
    this._updatedAt = Article.resolveNow(now);
  }

  public changeExcerpt(newExcerpt: string, now?: Date): void {
    this.ensureNotDeleted();
    const cleanExcerpt = newExcerpt.trim();
    if (this._excerpt === cleanExcerpt) return;

    this.setExcerptInternal(newExcerpt);
    this._updatedAt = Article.resolveNow(now);
  }

  public changeContent(newContent: string, now?: Date): void {
    this.ensureNotDeleted();
    const cleanContent = newContent.trim();
    if (this._content === cleanContent) return;

    this.setContentInternal(newContent);
    this._updatedAt = Article.resolveNow(now);
  }

  public changeCategory(newCategoryId: string, now?: Date): void {
    this.ensureNotDeleted();
    const cleanCategoryId = newCategoryId.trim();
    if (this._categoryId === cleanCategoryId) return;

    this.setCategoryInternal(newCategoryId);
    this._updatedAt = Article.resolveNow(now);
  }

  public changeThumbnail(newThumbnailId: string | null, now?: Date): void {
    this.ensureNotDeleted();
    const cleanThumbnailId = newThumbnailId?.trim() || null;
    if (this._thumbnailId === cleanThumbnailId) return;

    this.setThumbnailInternal(newThumbnailId);
    this._updatedAt = Article.resolveNow(now);
  }

  public feature(now?: Date): void {
    this.ensureNotDeleted();
    if (this._isFeatured) return;
    this._isFeatured = true;
    this._updatedAt = Article.resolveNow(now);
  }

  public unfeature(now?: Date): void {
    this.ensureNotDeleted();
    if (!this._isFeatured) return;
    this._isFeatured = false;
    this._updatedAt = Article.resolveNow(now);
  }

  public submitForReview(now?: Date): void {
    this.ensureNotDeleted();
    if (this._status === 'under_review') {
      throw new ArticleDomainError('Article is already under review');
    }
    if (this._status !== 'draft') {
      throw new ArticleDomainError(`Cannot submit article for review from ${this._status} status`);
    }
    this.transitionTo('under_review', now);
  }

  public publish(now?: Date): void {
    this.ensureNotDeleted();
    if (this._status === 'published') {
      throw new ArticleDomainError('Cannot publish an already published article');
    }
    if (this._status !== 'under_review') {
      throw new ArticleDomainError(`Cannot publish article from ${this._status} status`);
    }
    const timestamp = Article.resolveNow(now);
    this._status = 'published';
    this._publishedAt = timestamp;
    this._updatedAt = timestamp;
  }

  public rejectReview(now?: Date): void {
    this.ensureNotDeleted();
    if (this._status !== 'under_review') {
      throw new ArticleDomainError(`Cannot reject review from ${this._status} status`);
    }
    this._publishedAt = null; // Clear published timestamp on return to draft
    this.transitionTo('draft', now);
  }

  public archive(now?: Date): void {
    this.ensureNotDeleted();
    if (this._status === 'archived') {
      return;
    }
    if (this._status !== 'published' && this._status !== 'draft') {
      throw new ArticleDomainError(`Cannot archive article from ${this._status} status`);
    }
    this.transitionTo('archived', now);
  }

  public restoreDraft(now?: Date): void {
    this.ensureNotDeleted();
    if (this._status !== 'archived') {
      throw new ArticleDomainError(`Cannot restore draft from ${this._status} status`);
    }
    this._publishedAt = null; // Clear published timestamp when restoring to draft
    this.transitionTo('draft', now);
  }

  public recordView(): void {
    this.ensureNotDeleted();
    // PostgreSQL INT limit is 2147483647
    if (this._viewCount < MAX_VIEW_COUNT) {
      this._viewCount++;
    }
  }

  public softDelete(now?: Date): void {
    if (this._deletedAt) return;
    const timestamp = Article.resolveNow(now);
    this._deletedAt = timestamp;
    this._updatedAt = timestamp;
  }

  public restore(now?: Date): void {
    if (!this._deletedAt) return;
    this._deletedAt = null;
    this._updatedAt = Article.resolveNow(now);
  }

  public touch(now?: Date): void {
    this.ensureNotDeleted();
    this._updatedAt = Article.resolveNow(now);
  }

  // Helpers
  private ensureNotDeleted(): void {
    if (this._deletedAt) {
      throw new ArticleDomainError('Cannot modify a deleted article');
    }
  }

  private transitionTo(targetStatus: ArticleStatus, now?: Date): void {
    const allowedTransitions: Record<ArticleStatus, readonly ArticleStatus[]> = {
      draft: ['under_review', 'archived'],
      under_review: ['published', 'draft'],
      published: ['archived'],
      archived: ['draft'],
    };

    if (!allowedTransitions[this._status]?.includes(targetStatus)) {
      throw new ArticleDomainError(`Illegal status transition from ${this._status} to ${targetStatus}`);
    }

    const timestamp = Article.resolveNow(now);
    this._status = targetStatus;
    this._updatedAt = timestamp;
  }

  // Domain Comparison & Persistence helper
  public equals(other: Article): boolean {
    if (!(other instanceof Article)) return false;
    return this._id === other.id;
  }

  public toPersistence(): ArticleProps {
    return {
      id: this._id,
      title: this._title,
      slug: this._slug,
      excerpt: this._excerpt,
      content: this._content,
      thumbnailId: this._thumbnailId,
      authorId: this._authorId,
      categoryId: this._categoryId,
      status: this._status,
      viewCount: this._viewCount,
      isFeatured: this._isFeatured,
      publishedAt: this._publishedAt ? new Date(this._publishedAt.getTime()) : null,
      createdAt: new Date(this._createdAt.getTime()),
      updatedAt: new Date(this._updatedAt.getTime()),
      deletedAt: this._deletedAt ? new Date(this._deletedAt.getTime()) : null,
    };
  }
}
