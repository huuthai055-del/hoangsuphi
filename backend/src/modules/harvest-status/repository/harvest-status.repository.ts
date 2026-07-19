import { db, type TransactionClient, type Database } from '@/lib/database/client';
import { harvestUpdates } from '@/lib/database/schema/harvest-updates';
import { eq, and, isNull } from 'drizzle-orm';
import type {
  CreateHarvestUpdateRecord,
  HarvestUpdateRecord,
  IHarvestStatusRepository,
  PatchHarvestUpdateRecord,
} from './harvest-status.repository.interface';

export class HarvestStatusRepository implements IHarvestStatusRepository {
  public constructor(private readonly database: Database = db) {}

  private getClient(tx?: TransactionClient) {
    return tx ?? this.database;
  }

  async findById(id: string, tx?: TransactionClient): Promise<HarvestUpdateRecord | null> {
    const [row] = await this.getClient(tx)
      .select(harvestUpdateProjection)
      .from(harvestUpdates)
      .where(and(eq(harvestUpdates.id, id), isNull(harvestUpdates.deletedAt)))
      .limit(1);

    if (!row) return null;
    return row as HarvestUpdateRecord;
  }

  async findByIdForUpdate(id: string, tx: TransactionClient): Promise<HarvestUpdateRecord | null> {
    const [row] = await tx
      .select(harvestUpdateProjection)
      .from(harvestUpdates)
      .where(and(eq(harvestUpdates.id, id), isNull(harvestUpdates.deletedAt)))
      .limit(1)
      .for('update');

    return row ? (row as HarvestUpdateRecord) : null;
  }

  async create(data: CreateHarvestUpdateRecord, tx?: TransactionClient): Promise<void> {
    await this.getClient(tx).insert(harvestUpdates).values({
      id: data.id,
      regionId: data.regionId,
      stage: data.stage,
      observedAt: data.observedAt,
      title: data.title,
      summary: data.summary,
      advisory: data.advisory,
      status: data.status ?? 'DRAFT',
      createdBy: data.createdBy,
    });
  }

  async update(
    id: string,
    data: PatchHarvestUpdateRecord,
    tx?: TransactionClient
  ): Promise<boolean> {
    const [updated] = await this.getClient(tx)
      .update(harvestUpdates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(harvestUpdates.id, id), eq(harvestUpdates.status, 'DRAFT'), isNull(harvestUpdates.deletedAt)))
      .returning({ id: harvestUpdates.id });

    return !!updated;
  }

  async publish(id: string, publishedAt: Date, tx?: TransactionClient): Promise<boolean> {
    const [updated] = await this.getClient(tx)
      .update(harvestUpdates)
      .set({ status: 'PUBLISHED', publishedAt, updatedAt: new Date() })
      .where(and(eq(harvestUpdates.id, id), eq(harvestUpdates.status, 'DRAFT'), isNull(harvestUpdates.deletedAt)))
      .returning({ id: harvestUpdates.id });

    return !!updated;
  }

  async archive(id: string, tx?: TransactionClient): Promise<boolean> {
    const [updated] = await this.getClient(tx)
      .update(harvestUpdates)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(and(eq(harvestUpdates.id, id), eq(harvestUpdates.status, 'PUBLISHED'), isNull(harvestUpdates.deletedAt)))
      .returning({ id: harvestUpdates.id });

    return !!updated;
  }
}

const harvestUpdateProjection = {
  id: harvestUpdates.id,
  regionId: harvestUpdates.regionId,
  stage: harvestUpdates.stage,
  observedAt: harvestUpdates.observedAt,
  title: harvestUpdates.title,
  summary: harvestUpdates.summary,
  advisory: harvestUpdates.advisory,
  status: harvestUpdates.status,
  createdBy: harvestUpdates.createdBy,
  publishedAt: harvestUpdates.publishedAt,
  createdAt: harvestUpdates.createdAt,
  updatedAt: harvestUpdates.updatedAt,
  deletedAt: harvestUpdates.deletedAt,
} as const;
