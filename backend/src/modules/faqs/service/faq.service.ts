import type { Faq } from '../domain/faq.entity';
import type { FaqStatus } from '../domain/faq.entity';
import type { IFaqRepository, FaqFilters } from '../repository/faq-repository.interface';
import { generateUuidV7 } from '@/common/utils/uuid';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';
import { FaqDomainError } from '../domain/faq.errors';
import { runInTransaction } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import type { PaginatedResult, PaginationOptions } from '@/common/types/pagination';

function mapDomainError(err: Error): Error {
  if (err instanceof DuplicateKeyRepositoryError) {
    return new ConflictError('Unique constraint violated: FAQ already exists', { cause: err });
  }
  if (err instanceof EntityNotFoundRepositoryError) {
    return new NotFoundError(err.message, { cause: err });
  }
  if (err instanceof FaqDomainError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('question')) return new ValidationError({ question: err.message });
    if (msg.includes('answer')) return new ValidationError({ answer: err.message });
    if (msg.includes('display order')) return new ValidationError({ displayOrder: err.message });
    if (msg.includes('status')) return new ValidationError({ status: err.message });
    return new ValidationError({ faq: err.message });
  }
  return err;
}

export class FaqService {
  constructor(private readonly faqRepo: IFaqRepository) {}

  private async loadFaqOrThrow(id: string, tx?: unknown): Promise<Faq> {
    const faq = await this.faqRepo.findById(id, tx);
    if (!faq) {
      throw new NotFoundError(`FAQ not found with ID: ${id}`);
    }
    return faq;
  }

  public async createFaq(input: {
    question: string;
    answer: string;
    category?: string | null;
    displayOrder?: number;
    createdBy: string;
    now?: Date;
  }): Promise<Faq> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const { Faq: FaqClass } = await import('../domain/faq.entity');
        const faq = FaqClass.create({
          id: generateUuidV7(),
          question: input.question,
          answer: input.answer,
          category: input.category,
          displayOrder: input.displayOrder,
          createdBy: input.createdBy,
          now: input.now,
        });
        await this.faqRepo.create(faq, tx);
        logger.info({ traceId: store?.requestId, faqId: faq.id, action: 'create_faq' }, `FAQ created: ${faq.id}`);
        return faq;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async updateFaq(
    id: string,
    input: {
      question?: string;
      answer?: string;
      category?: string | null;
      displayOrder?: number;
    },
    now?: Date
  ): Promise<Faq> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const faq = await this.loadFaqOrThrow(id, tx);
        faq.update(input, now);
        await this.faqRepo.update(faq, tx);
        logger.info({ traceId: store?.requestId, faqId: faq.id, action: 'update_faq' }, `FAQ updated: ${faq.id}`);
        return faq;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async publishFaq(id: string, now?: Date): Promise<Faq> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const faq = await this.loadFaqOrThrow(id, tx);
        faq.publish(now);
        await this.faqRepo.update(faq, tx);
        logger.info({ traceId: store?.requestId, faqId: faq.id, action: 'publish_faq' }, `FAQ published: ${faq.id}`);
        return faq;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async archiveFaq(id: string, now?: Date): Promise<Faq> {
    const store = requestStore.getStore();
    try {
      return await runInTransaction(async (tx) => {
        const faq = await this.loadFaqOrThrow(id, tx);
        faq.archive(now);
        await this.faqRepo.update(faq, tx);
        logger.info({ traceId: store?.requestId, faqId: faq.id, action: 'archive_faq' }, `FAQ archived: ${faq.id}`);
        return faq;
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async deleteFaq(id: string, now?: Date): Promise<void> {
    const store = requestStore.getStore();
    try {
      await runInTransaction(async (tx) => {
        const faq = await this.loadFaqOrThrow(id, tx);
        faq.softDelete(now);
        await this.faqRepo.delete(id, tx);
        logger.info({ traceId: store?.requestId, faqId: faq.id, action: 'delete_faq' }, `FAQ deleted: ${faq.id}`);
      });
    } catch (err) {
      throw mapDomainError(err as Error);
    }
  }

  public async getFaq(id: string): Promise<Faq> {
    return this.loadFaqOrThrow(id);
  }

  public async listFaqs(options: {
    filters?: FaqFilters;
    pagination?: PaginationOptions;
    sort?: { field: string; order: 'asc' | 'desc' };
  }): Promise<PaginatedResult<Faq>> {
    return this.faqRepo.findMany(options);
  }
}
