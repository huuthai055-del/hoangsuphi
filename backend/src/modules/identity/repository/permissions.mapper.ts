import type { InferSelectModel } from 'drizzle-orm';
import type { permissions } from '@/lib/database/schema/references';

export type PermissionDbModel = InferSelectModel<typeof permissions>;

export interface PermissionDomainModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PermissionMapper = {
  toDomain(raw: PermissionDbModel): PermissionDomainModel {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      description: raw.description,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  },

  toPersistence(domain: PermissionDomainModel): PermissionDbModel {
    return {
      id: domain.id,
      code: domain.code,
      name: domain.name,
      description: domain.description,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  },
};
