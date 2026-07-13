import { Itinerary, type ItineraryVisibility, type ItineraryStatus } from '../domain/itinerary.entity';
import type { ItineraryItem, ItineraryItemOwnerType } from '../domain/itinerary-item.entity';
import type { IItineraryRepository, ItineraryFilters } from '../repository/itinerary-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import { ItineraryDomainError } from '../domain/itinerary.errors';
import { runInTransaction } from '@/lib/database/client';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: Itinerary already exists', { cause: err });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof ItineraryDomainError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('title')) {
      return new ValidationError({ title: err.message });
    }
    if (msg.includes('day number') || msg.includes('day_number')) {
      return new ValidationError({ dayNumber: err.message });
    }
    if (msg.includes('display order') || msg.includes('display_order')) {
      return new ValidationError({ displayOrder: err.message });
    }
    if (msg.includes('status') || msg.includes('state')) {
      return new ValidationError({ status: err.message });
    }
    if (msg.includes('empty')) {
      return new ValidationError({ items: err.message });
    }
    if (msg.includes('duplicate')) {
      return new ValidationError({ duplicate: err.message });
    }
    return new ValidationError({ itinerary: err.message });
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
    try {
      return await runInTransaction(async (tx) => {
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
    try {
      return await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.updateInfo(props, now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteItinerary(id: string, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.softDelete(now);
        await this.itineraryRepo.delete(id, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async publishItinerary(id: string, now?: Date): Promise<Itinerary> {
    try {
      return await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.publish(now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async archiveItinerary(id: string, now?: Date): Promise<Itinerary> {
    try {
      return await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.archive(now);
        await this.itineraryRepo.update(itinerary, tx);
        return itinerary;
      });
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
    try {
      return await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        
        const itemId = props.id || generateUuidV7();
        const item = itinerary.addItem({
          id: itemId,
          ownerType: props.ownerType,
          ownerId: props.ownerId,
          dayNumber: props.dayNumber,
          note: props.note,
        }, now);

        await this.itineraryRepo.update(itinerary, tx);
        return item;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async removeItemFromItinerary(id: string, itemId: string, now?: Date): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.removeItem(itemId, now);
        await this.itineraryRepo.update(itinerary, tx);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async reorderItineraryItems(
    id: string,
    itemIdOrders: Array<{ id: string; dayNumber: number; displayOrder: number }>,
    now?: Date
  ): Promise<void> {
    try {
      await runInTransaction(async (tx) => {
        const itinerary = await this.loadItineraryOrThrow(id, tx);
        itinerary.reorderItems(itemIdOrders, now);
        await this.itineraryRepo.update(itinerary, tx);
      });
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
