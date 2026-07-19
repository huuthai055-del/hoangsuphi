import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';
import { generateUuidV7 } from '@/common/utils/uuid';
import { runInTransaction } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import type { ItineraryItem, ItineraryItemOwnerType } from '../domain/itinerary-item.entity';
import { Itinerary, type ItineraryVisibility } from '../domain/itinerary.entity';
import { ItineraryDomainError } from '../domain/itinerary.errors';
import type {
  IItineraryRepository,
  ItineraryFilters,
} from '../repository/itinerary-repository.interface';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: Itinerary already exists', {
      cause: err,
    });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof ItineraryDomainError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('title')) {
      return new ValidationError('Validation failed', { title: err.message });
    }
    if (msg.includes('day number') || msg.includes('day_number')) {
      return new ValidationError('Validation failed', { dayNumber: err.message });
    }
    if (msg.includes('display order') || msg.includes('display_order')) {
      return new ValidationError('Validation failed', { displayOrder: err.message });
    }
    if (msg.includes('status') || msg.includes('state')) {
      return new ValidationError('Validation failed', { status: err.message });
    }
    if (msg.includes('empty')) {
      return new ValidationError('Validation failed', { items: err.message });
    }
    if (msg.includes('duplicate')) {
      return new ValidationError('Validation failed', { duplicate: err.message });
    }
    return new ValidationError('Validation failed', { itinerary: err.message });
  }
  return err;
}

export class ItineraryService {
  constructor(private readonly itineraryRepo: IItineraryRepository) {}

  private async loadItineraryOrThrow(id: string, tx?: unknown): Promise<Itinerary> {
    const itinerary = await this.itineraryRepo.findById(id, tx);
    if (!itinerary) {
      throw new NotFoundError(`Itinerary not found with ID: ${id}`);
    }
    return itinerary;
  }

  public async createItinerary(props: {
    title: string;
    description?: string | null;
    visibility?: ItineraryVisibility;
    createdBy: string;
    now?: Date;
  }): Promise<Itinerary> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      const result = await runInTransaction(async (tx) => {
        const itinerary = Itinerary.create({
          id: generateUuidV7(),
          title: props.title,
          description: props.description,
          visibility: props.visibility,
          createdBy: props.createdBy,
          now: props.now,
        });

        await this.itineraryRepo.create(itinerary, tx);
        return itinerary;
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: result.id,
          executionTime,
          action: 'create_itinerary',
        },
        `Itinerary created successfully: ${result.title} (${result.id})`
      );
      return result;
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async updateItineraryInfo(
    id: string,
    props: {
      title?: string;
      description?: string | null;
      visibility?: ItineraryVisibility;
    },
    now?: Date
  ): Promise<Itinerary> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      const result = await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.updateInfo(props, now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: result.id,
          executionTime,
          action: 'update_itinerary',
        },
        `Itinerary info updated: ${result.id}`
      );
      return result;
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteItinerary(id: string, now?: Date): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.softDelete(now);
        await this.itineraryRepo.delete(id, tx);
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: id,
          executionTime,
          action: 'delete_itinerary',
        },
        `Itinerary soft-deleted: ${id}`
      );
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async publishItinerary(id: string, now?: Date): Promise<Itinerary> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      const result = await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.publish(now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: result.id,
          executionTime,
          action: 'publish_itinerary',
        },
        `Itinerary published: ${result.id}`
      );
      return result;
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async archiveItinerary(id: string, now?: Date): Promise<Itinerary> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      const result = await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.archive(now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: result.id,
          executionTime,
          action: 'archive_itinerary',
        },
        `Itinerary archived: ${result.id}`
      );
      return result;
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async addItemToItinerary(
    id: string,
    props: {
      id?: string;
      ownerType: ItineraryItemOwnerType;
      ownerId: string;
      dayNumber: number;
      note?: string | null;
    },
    now?: Date
  ): Promise<ItineraryItem> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      const result = await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);

        const itemId = props.id || generateUuidV7();
        const item = itinerary.addItem(
          {
            id: itemId,
            ownerType: props.ownerType,
            ownerId: props.ownerId,
            dayNumber: props.dayNumber,
            note: props.note,
          },
          now
        );

        await this.itineraryRepo.update(itinerary, tx);
        return item;
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: id,
          executionTime,
          action: 'add_item_to_itinerary',
        },
        `Item ${result.id} added to Itinerary ${id}`
      );
      return result;
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async removeItemFromItinerary(id: string, itemId: string, now?: Date): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.removeItem(itemId, now);
        await this.itineraryRepo.update(itinerary, tx);
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: id,
          executionTime,
          action: 'remove_item_from_itinerary',
        },
        `Item ${itemId} removed from Itinerary ${id}`
      );
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async reorderItineraryItems(
    id: string,
    itemIdOrders: Array<{ id: string; dayNumber: number; displayOrder: number }>,
    now?: Date
  ): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.reorderItems(itemIdOrders, now);
        await this.itineraryRepo.update(itinerary, tx);
      });

      const executionTime = Math.round(performance.now() - startTime);
      logger.info(
        {
          traceId: store?.requestId,
          itineraryId: id,
          executionTime,
          action: 'reorder_itinerary_items',
        },
        `Items reordered in Itinerary ${id}`
      );
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async getItinerary(id: string): Promise<Itinerary> {
    return this.loadItineraryOrThrow(id);
  }

  public async listItineraries(options: {
    filters?: ItineraryFilters;
    pagination?: PaginationOptions;
    sort?: { field: string; order: 'asc' | 'desc' };
  }): Promise<PaginatedResult<Itinerary>> {
    return this.itineraryRepo.findMany(options);
  }

  public async listItinerariesByUser(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Itinerary>> {
    return this.itineraryRepo.findByUser(userId, pagination);
  }
}
