import type { TopList, TopListStatus } from '../domain/top-list.entity';
import type { TopListItemOwnerType } from '../domain/top-list-item.entity';
import type { TopListItem } from '../domain/top-list-item.entity';
import type { ITopListRepository, TopListFilters } from '../repository/top-list-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import { TopListDomainError } from '../domain/faq.errors';
import { runInTransaction } from '@/lib/database/client';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: TopList or slug already exists', { cause: err });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof TopListDomainError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('title')) return new ValidationError({ title: err.message });
    if (msg.includes('slug')) return new ValidationError({ slug: err.message });
    if (msg.includes('status') || msg.includes('state')) return new ValidationError({ status: err.message });
    if (msg.includes('empty')) return new ValidationError({ items: err.message });
    if (msg.includes('duplicate')) return new ValidationError({ duplicate: err.message });
    if (msg.includes('display order')) return new ValidationError({ displayOrder: err.message });
    return new ValidationError({ topList: err.message });
  }
  return err;
}

export class TopListService {
  constructor(private readonly topListRepo: ITopListRepository) {}

  private async loadTopListOrThrow(id: string, tx?: unknown): Promise<TopList> {
    const topList = await this.topListRepo.findById(id, tx);
    if (!topList) {
      throw new NotFoundError(`TopList not found with ID: ${id}`);
    }
    return topList;
  }

  public async createTopList(input: {
    title: string;
    description?: string | null;
    slug: string;
    category?: string | null;
    featured?: boolean;
    createdBy: string;
    now?: Date;
  }): Promise<TopList> {
    try {
      return await runInTransaction(async (tx) => {
        const { TopList: TopListClass } = await import('../domain/top-list.entity');
        const topList = TopListClass.create({
          id: generateUuidV7(),
          title: input.title,
          description: input.description,
          slug: input.slug,
          category: input.category,
          featured: input.featured,
          createdBy: input.createdBy,
          now: input.now,
        });
        await this.topListRepo.create(topList, tx);
        return topList;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async updateTopList(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      featured?: boolean;
    },
    now?: Date
  ): Promise<TopList> {
    try {
      return await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.update(input, now);
        await this.topListRepo.update(topList, tx);
        return topList;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async publishTopList(id: string, now?: Date): Promise<TopList> {
    try {
      return await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.publish(now);
        await this.topListRepo.update(topList, tx);
        return topList;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async archiveTopList(id: string, now?: Date): Promise<TopList> {
    try {
      return await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.archive(now);
        await this.topListRepo.update(topList, tx);
        return topList;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteTopList(id: string, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.softDelete(now);
        await this.topListRepo.delete(id, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async addItemToTopList(
    id: string,
    input: {
      ownerType: TopListItemOwnerType;
      ownerId: string;
    },
    now?: Date
  ): Promise<TopListItem> {
    try {
      return await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        const item = topList.addItem({
          id: generateUuidV7(),
          ownerType: input.ownerType,
          ownerId: input.ownerId,
        }, now);
        await this.topListRepo.update(topList, tx);
        return item;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async removeItemFromTopList(id: string, itemId: string, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.removeItem(itemId, now);
        await this.topListRepo.update(topList, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async reorderTopListItems(
    id: string,
    itemIdOrders: Array<{ id: string; displayOrder: number }>,
    now?: Date
  ): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const topList = await this.loadTopListOrThrow(id, tx);
        topList.reorderItems(itemIdOrders, now);
        await this.topListRepo.update(topList, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async getTopList(id: string): Promise<TopList> {
    return this.loadTopListOrThrow(id);
  }

  public async listTopLists(options: {
    filters?: TopListFilters;
    pagination?: PaginationOptions;
    sort?: { field: string; order: 'asc' | 'desc' };
  }): Promise<PaginatedResult<TopList>> {
    return this.topListRepo.findMany(options);
  }
}
