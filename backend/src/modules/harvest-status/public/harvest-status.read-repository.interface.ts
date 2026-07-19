import type { HarvestStage } from '../repository/harvest-status.repository.interface';
import type { HarvestCurrentKeyset, HarvestTimelineKeyset } from './harvest-status.cursor';

export interface HarvestPublicRegionProjection {
  id: string;
  name: string;
  slug: string;
  level: number;
}

export interface HarvestPublicMediaSource {
  id: string;
  storageProvider: 'LOCAL' | 'CLOUDINARY';
  storageKey: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  variant: string;
}

export interface HarvestPublicUpdateProjection {
  id: string;
  stage: HarvestStage;
  observedAt: Date;
  title: string;
  summary: string;
  advisory: string | null;
  publishedAt: Date;
  media: HarvestPublicMediaSource[];
}

export interface HarvestCurrentProjection {
  region: HarvestPublicRegionProjection;
  current: HarvestPublicUpdateProjection;
}

export interface HarvestTimelineProjection {
  current: HarvestPublicUpdateProjection | null;
  timeline: HarvestPublicUpdateProjection[];
}

export interface IHarvestStatusReadRepository {
  findCurrentPage(criteria: {
    limit: number;
    after: HarvestCurrentKeyset | null;
  }): Promise<HarvestCurrentProjection[]>;

  findPublicRegionBySlug(slug: string): Promise<HarvestPublicRegionProjection | null>;

  findRegionTimeline(criteria: {
    regionId: string;
    limit: number;
    after: HarvestTimelineKeyset | null;
  }): Promise<HarvestTimelineProjection>;
}
