import type { TransactionClient } from '@/lib/database/client';

export type HarvestStage =
  | 'PREPARING'
  | 'TRANSPLANTING'
  | 'GREEN'
  | 'RIPENING'
  | 'GOLDEN'
  | 'HARVESTING'
  | 'OFF_SEASON';

export type HarvestUpdateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type HarvestUpdateRecord = {
  id: string;
  regionId: string;
  stage: HarvestStage;
  observedAt: Date;
  title: string;
  summary: string;
  advisory: string | null;
  status: HarvestUpdateStatus;
  createdBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateHarvestUpdateRecord = Omit<
  HarvestUpdateRecord,
  'createdAt' | 'updatedAt' | 'deletedAt' | 'publishedAt' | 'status'
> & {
  status?: HarvestUpdateStatus;
};

export type PatchHarvestUpdateRecord = Partial<
  Pick<HarvestUpdateRecord, 'regionId' | 'stage' | 'observedAt' | 'title' | 'summary' | 'advisory'>
>;

export interface IHarvestStatusRepository {
  findById(id: string, tx?: TransactionClient): Promise<HarvestUpdateRecord | null>;
  findByIdForUpdate(id: string, tx: TransactionClient): Promise<HarvestUpdateRecord | null>;
  create(data: CreateHarvestUpdateRecord, tx?: TransactionClient): Promise<void>;
  update(id: string, data: PatchHarvestUpdateRecord, tx?: TransactionClient): Promise<boolean>;
  publish(id: string, publishedAt: Date, tx?: TransactionClient): Promise<boolean>;
  archive(id: string, tx?: TransactionClient): Promise<boolean>;
}
