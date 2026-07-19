import { DatabaseError } from '@/common/errors/http.errors';
import type { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import type {
  HarvestPaginationDto,
  HarvestPublicMediaDto,
  HarvestPublicQuery,
  HarvestPublicRegionDto,
  HarvestPublicUpdateDto,
} from '../dto/harvest-status.public.dto';
import type { HarvestStatusCursorCodec } from './harvest-status.cursor';
import type {
  HarvestCurrentProjection,
  HarvestPublicMediaSource,
  HarvestPublicUpdateProjection,
  IHarvestStatusReadRepository,
} from './harvest-status.read-repository.interface';
import { HarvestRegionUnavailableError } from './harvest-status.public.errors';

export interface HarvestCurrentListResult {
  data: Array<{ region: HarvestPublicRegionDto; current: HarvestPublicUpdateDto }>;
  pagination: HarvestPaginationDto;
}

export interface HarvestRegionTimelineResult {
  data: {
    region: HarvestPublicRegionDto;
    current: HarvestPublicUpdateDto | null;
    timeline: HarvestPublicUpdateDto[];
  };
  pagination: HarvestPaginationDto;
}

export class HarvestStatusPublicService {
  constructor(
    private readonly repository: IHarvestStatusReadRepository,
    private readonly cursorCodec: HarvestStatusCursorCodec,
    private readonly storageResolver: MediaStorageResolver,
    private readonly publicSiteUrl: string
  ) {}

  async getCurrent(query: HarvestPublicQuery): Promise<HarvestCurrentListResult> {
    const fingerprint = this.cursorCodec.fingerprint('current', query.limit);
    const after = query.cursor
      ? this.cursorCodec.decode(query.cursor, fingerprint, 'current')
      : null;
    if (after?.scope === 'timeline') throw new Error('Unexpected Harvest cursor scope');

    try {
      const rows = await this.repository.findCurrentPage({
        limit: query.limit,
        after,
      });
      const hasNextPage = rows.length > query.limit;
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return {
        data: await Promise.all(page.map((row) => this.mapCurrent(row))),
        pagination: {
          hasNextPage,
          nextCursor:
            hasNextPage && last
              ? this.cursorCodec.encode(
                  {
                    scope: 'current',
                    observedAt: last.current.observedAt,
                    regionName: last.region.name,
                    regionId: last.region.id,
                  },
                  fingerprint
                )
              : null,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Harvest public current status is temporarily unavailable', undefined, this.asError(error));
    }
  }

  async getRegionTimeline(slug: string, query: HarvestPublicQuery): Promise<HarvestRegionTimelineResult> {
    let region: HarvestPublicRegionDto | null;
    try {
      region = await this.repository.findPublicRegionBySlug(slug);
    } catch (error) {
      throw new DatabaseError('Harvest public region is temporarily unavailable', undefined, this.asError(error));
    }
    if (!region) throw new HarvestRegionUnavailableError();

    const fingerprint = this.cursorCodec.fingerprint('timeline', query.limit, region.id);
    const after = query.cursor
      ? this.cursorCodec.decode(query.cursor, fingerprint, 'timeline')
      : null;
    if (after?.scope === 'current') throw new Error('Unexpected Harvest cursor scope');

    try {
      const projection = await this.repository.findRegionTimeline({
        regionId: region.id,
        limit: query.limit,
        after,
      });
      const hasNextPage = projection.timeline.length > query.limit;
      const page = projection.timeline.slice(0, query.limit);
      const last = page.at(-1);
      return {
        data: {
          region,
          current: projection.current ? await this.mapUpdate(projection.current) : null,
          timeline: await Promise.all(page.map((update) => this.mapUpdate(update))),
        },
        pagination: {
          hasNextPage,
          nextCursor:
            hasNextPage && last
              ? this.cursorCodec.encode(
                  {
                    scope: 'timeline',
                    observedAt: last.observedAt,
                    publishedAt: last.publishedAt,
                    id: last.id,
                  },
                  fingerprint
                )
              : null,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Harvest public timeline is temporarily unavailable', undefined, this.asError(error));
    }
  }

  private async mapCurrent(
    row: HarvestCurrentProjection
  ): Promise<{ region: HarvestPublicRegionDto; current: HarvestPublicUpdateDto }> {
    return { region: row.region, current: await this.mapUpdate(row.current) };
  }

  private async mapUpdate(update: HarvestPublicUpdateProjection): Promise<HarvestPublicUpdateDto> {
    return {
      id: update.id,
      stage: update.stage,
      observedAt: update.observedAt.toISOString(),
      title: update.title,
      summary: update.summary,
      advisory: update.advisory,
      publishedAt: update.publishedAt.toISOString(),
      media: await Promise.all(update.media.map((item) => this.mapMedia(item))),
    };
  }

  private async mapMedia(media: HarvestPublicMediaSource): Promise<HarvestPublicMediaDto> {
    try {
      const rawUrl = await this.storageResolver.resolve(media.storageProvider).getUrl(media.storageKey);
      const url = rawUrl.startsWith('/') ? `${this.publicSiteUrl}${rawUrl}` : rawUrl;
      return {
        id: media.id,
        url,
        width: media.width,
        height: media.height,
        altText: media.altText,
        variant: media.variant,
      };
    } catch (error) {
      throw new DatabaseError('Harvest public media is temporarily unavailable', undefined, this.asError(error));
    }
  }

  private asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}
