import type { ITagsRepository, ListTagsOptions } from '../repository/tags-repository.interface';
import type { ILogger, IClock } from './interfaces';
import { Tag } from '../domain/tag.entity';
import { generateUuidV7 } from '@/common/utils/uuid';
import { slugify } from '@/common/utils/slug';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import { DuplicateKeyRepositoryError, EntityNotFoundRepositoryError } from '../repository/repository-errors';

export interface CreateTagCommand {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  isFeatured?: boolean;
}

export interface UpdateTagCommand {
  name?: string;
  description?: string | null;
  isFeatured?: boolean;
}

export class TagsService {
  constructor(
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
      this.logger.info({
        ...context,
        executionTime,
        action,
      }, `Tag action ${action} completed successfully`);
      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      this.logger.error({
        ...context,
        executionTime,
        action,
        error: error instanceof Error ? error.message : String(error),
      }, `Tag action ${action} failed`);
      throw error;
    }
  }

  public async getTagById(id: string): Promise<Tag> {
    const tag = await this.tagsRepo.findById(id);
    if (!tag) {
      throw new NotFoundError(`Tag not found with ID: ${id}`);
    }
    return tag;
  }

  public async getTagBySlug(slug: string): Promise<Tag> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const tag = await this.tagsRepo.findBySlug(cleanSlug);
    if (!tag) {
      throw new NotFoundError(`Tag not found with slug: ${cleanSlug}`);
    }
    return tag;
  }

  public async listTags(options?: ListTagsOptions): Promise<Tag[]> {
    return this.tagsRepo.findAll(options);
  }

  public async searchTags(keyword: string): Promise<Tag[]> {
    const allTags = await this.tagsRepo.findAll();
    const cleanKeyword = (keyword || '').trim().toLowerCase();
    if (!cleanKeyword) {
      return allTags;
    }
    return allTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(cleanKeyword) ||
        tag.slug.toLowerCase().includes(cleanKeyword)
    );
  }

  public async createTag(command: CreateTagCommand): Promise<Tag> {
    return this.executeWithLogging('create_tag', { name: command.name, slug: command.slug }, async () => {
      const name = (command.name || '').trim();
      if (!name) {
        throw new ValidationError('Tag name cannot be blank');
      }

      let slug = '';
      if (command.slug) {
        slug = command.slug.trim();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          throw new ValidationError('Tag slug must be a valid SEO slug format');
        }
      } else {
        slug = slugify(name);
        if (!slug) {
          throw new ValidationError('Could not generate a valid SEO slug from name');
        }
      }

      const exists = await this.tagsRepo.existsBySlug(slug);
      if (exists) {
        throw new ConflictError(`Tag slug already exists: ${slug}`);
      }

      const id = command.id ?? generateUuidV7();
      const tag = Tag.create(
        id,
        name,
        slug,
        command.description ?? null,
        command.isFeatured ?? false,
        this.clock.now()
      );

      try {
        await this.tagsRepo.save(tag);
      } catch (err) {
        if (err instanceof DuplicateKeyRepositoryError) {
          throw new ConflictError(`Tag slug already exists: ${slug}`);
        }
        throw err;
      }

      return tag;
    });
  }

  public async updateTag(id: string, command: UpdateTagCommand): Promise<Tag> {
    return this.executeWithLogging('update_tag', { tagId: id }, async () => {
      const tag = await this.tagsRepo.findById(id);
      if (!tag) {
        throw new NotFoundError(`Tag not found with ID: ${id}`);
      }

      if (command.name !== undefined) {
        tag.rename(command.name, this.clock.now());
      }

      if (command.description !== undefined) {
        tag.changeDescription(command.description, this.clock.now());
      }

      if (command.isFeatured !== undefined) {
        if (command.isFeatured) {
          tag.feature(this.clock.now());
        } else {
          tag.unfeature(this.clock.now());
        }
      }

      try {
        await this.tagsRepo.update(tag);
      } catch (err) {
        if (err instanceof EntityNotFoundRepositoryError) {
          throw new NotFoundError(`Tag not found with ID: ${id}`);
        }
        throw err;
      }

      return tag;
    });
  }

  public async deleteTag(id: string): Promise<void> {
    await this.executeWithLogging('delete_tag', { tagId: id }, async () => {
      const exists = await this.tagsRepo.exists(id);
      if (!exists) {
        throw new NotFoundError(`Tag not found with ID: ${id}`);
      }

      try {
        await this.tagsRepo.delete(id);
      } catch (err) {
        if (err instanceof EntityNotFoundRepositoryError) {
          throw new NotFoundError(`Tag not found with ID: ${id}`);
        }
        throw err;
      }
    });
  }
}
