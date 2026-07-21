import { DatabaseError } from '@/common/errors/http.errors';
import type { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import { toPlainTextSummary } from '@/modules/search/service/search-result.mapper';
import type { PublicCatalogCursorCodec } from './public-catalog.cursor';
import { PublicCatalogNotFoundError } from './public-catalog.errors';
import type {
  IPublicCatalogRepository,
  PublicCatalogContactProjection,
  PublicCatalogDetailProjection,
  PublicCatalogItemProjection,
  PublicCatalogKind,
  PublicCatalogListQuery,
  PublicCatalogMediaSource,
  PublicCatalogReferenceProjection,
  PublicCatalogRelatedProjection,
  PublicReferenceKind,
} from './public-catalog.types';

export interface PublicCatalogMediaDto {
  id: string | null;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

export interface PublicCatalogItemDto {
  kind: PublicCatalogItemProjection['entityType'];
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  canonicalPath: string;
  updatedAt: string;
  region: PublicCatalogItemProjection['region'];
  taxonomy: PublicCatalogReferenceProjection | null;
  image: PublicCatalogMediaDto | null;
  rating: { average: number | null; count: number };
  price: { min: string; max: string; currency: 'VND' } | null;
}

export interface PublicCatalogDetailDto extends PublicCatalogItemDto {
  description: string | null;
  content: string | null;
  location: PublicCatalogDetailProjection['location'];
  media: PublicCatalogMediaDto[];
  amenities: PublicCatalogReferenceProjection[];
  contact: {
    phoneTel: string | null;
    phoneDisplay: string | null;
    zaloUrl: string | null;
    websiteUrl: string | null;
  } | null;
  related: Array<{
    kind: PublicCatalogRelatedProjection['entityType'];
    id: string;
    name: string;
    slug: string;
    canonicalPath: string;
  }>;
}

export interface PublicCatalogListResponse {
  data: PublicCatalogItemDto[];
  meta: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    totalReturned: number;
  };
  error: null;
}

export class PublicCatalogService {
  constructor(
    private readonly repository: IPublicCatalogRepository,
    private readonly cursorCodec: PublicCatalogCursorCodec,
    private readonly storageResolver: MediaStorageResolver,
    private readonly publicSiteUrl: string
  ) {}

  async list(query: PublicCatalogListQuery): Promise<PublicCatalogListResponse> {
    const fingerprint = this.cursorCodec.fingerprint(query);
    const after = query.cursor
      ? this.cursorCodec.decode(query.cursor, fingerprint, query.sort)
      : null;
    try {
      const rows = await this.repository.findPage({ ...query, after });
      const hasMore = rows.length > query.limit;
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return {
        data: await Promise.all(page.map((item) => this.mapItem(item))),
        meta: {
          cursor: query.cursor,
          hasMore,
          totalReturned: page.length,
          nextCursor:
            hasMore && last
              ? this.cursorCodec.encode(
                  {
                    sort: query.sort,
                    sortTimestamp: query.sort === 'newest' ? last.updatedAt : null,
                    nameKey: last.nameKey,
                    id: last.id,
                  },
                  fingerprint
                )
              : null,
        },
        error: null,
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        'Public catalog list is temporarily unavailable',
        undefined,
        this.asError(error)
      );
    }
  }

  async detail(
    kind: PublicCatalogKind,
    slug: string
  ): Promise<{ data: PublicCatalogDetailDto; error: null }> {
    let projection: PublicCatalogDetailProjection | null;
    try {
      projection = await this.repository.findDetail(kind, slug);
    } catch (error) {
      throw new DatabaseError(
        'Public catalog detail is temporarily unavailable',
        undefined,
        this.asError(error)
      );
    }
    if (!projection) throw new PublicCatalogNotFoundError();
    return { data: await this.mapDetail(projection), error: null };
  }

  async references(kind: PublicReferenceKind): Promise<{
    data: PublicCatalogReferenceProjection[];
    meta: { totalReturned: number };
    error: null;
  }> {
    try {
      const data = await this.repository.listReferences(kind);
      return { data, meta: { totalReturned: data.length }, error: null };
    } catch (error) {
      throw new DatabaseError(
        'Public catalog references are temporarily unavailable',
        undefined,
        this.asError(error)
      );
    }
  }

  private async mapItem(item: PublicCatalogItemProjection): Promise<PublicCatalogItemDto> {
    return {
      kind: item.entityType,
      id: item.id,
      name: item.name,
      slug: item.slug,
      summary: toPlainTextSummary(item.summarySource),
      canonicalPath: this.canonicalPath(item.entityType, item.slug),
      updatedAt: item.updatedAt.toISOString(),
      region: item.region,
      taxonomy: item.taxonomy,
      image:
        (await this.mapMedia(item.image)) ?? this.mapCoverUrl(item.coverUrlCandidate, item.name),
      rating: { average: this.mapRating(item.rating.average), count: item.rating.count },
      price: this.mapPrice(item.priceMin, item.priceMax),
    };
  }

  private async mapDetail(item: PublicCatalogDetailProjection): Promise<PublicCatalogDetailDto> {
    const base = await this.mapItem(item);
    const media = (await Promise.all(item.media.map((entry) => this.mapMedia(entry)))).filter(
      (entry): entry is PublicCatalogMediaDto => entry !== null
    );
    return {
      ...base,
      description: toPlainTextSummary(item.descriptionSource),
      content: item.contentSource,
      location: item.location,
      media,
      amenities: item.amenities,
      contact: this.mapContact(item.contact),
      related: item.related.map((related) => ({
        kind: related.entityType,
        id: related.id,
        name: related.name,
        slug: related.slug,
        canonicalPath: this.canonicalPath(related.entityType, related.slug),
      })),
    };
  }

  private async mapMedia(
    source: PublicCatalogMediaSource | null
  ): Promise<PublicCatalogMediaDto | null> {
    if (!source) return null;
    try {
      const raw = await this.storageResolver
        .resolve(source.storageProvider)
        .getUrl(source.storageKey);
      const candidate = raw.startsWith('/') ? `${this.publicSiteUrl}${raw}` : raw;
      const url = this.safePublicMediaUrl(candidate);
      return url
        ? {
            id: source.id,
            url,
            width: source.width,
            height: source.height,
            altText: source.altText,
          }
        : null;
    } catch {
      return null;
    }
  }

  private mapCoverUrl(value: string | null, altText: string): PublicCatalogMediaDto | null {
    const url = this.safePublicMediaUrl(value);
    return url ? { id: null, url, width: null, height: null, altText } : null;
  }

  private mapRating(value: string | null): number | null {
    if (value === null) return null;
    if (!/^(?:[1-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/u.test(value)) {
      throw new DatabaseError('Public catalog rating projection is invalid');
    }
    return Number(value);
  }

  private mapPrice(min: string | null, max: string | null): PublicCatalogItemDto['price'] {
    if (min === null && max === null) return null;
    if (
      min === null ||
      max === null ||
      !/^\d+(?:\.\d{1,2})?$/u.test(min) ||
      !/^\d+(?:\.\d{1,2})?$/u.test(max)
    ) {
      throw new DatabaseError('Public catalog price projection is invalid');
    }
    return { min, max, currency: 'VND' };
  }

  private mapContact(
    contact: PublicCatalogContactProjection | null
  ): PublicCatalogDetailDto['contact'] {
    if (!contact) return null;
    const phone =
      contact.phoneE164 && /^\+[1-9]\d{7,14}$/u.test(contact.phoneE164) ? contact.phoneE164 : null;
    const zaloUrl =
      contact.zaloUrl && /^https:\/\/zalo\.me\/[A-Za-z0-9._-]+\/?$/u.test(contact.zaloUrl)
        ? contact.zaloUrl
        : null;
    const websiteUrl = this.safeHttpsUrl(contact.websiteUrl);
    if (!phone && !zaloUrl && !websiteUrl) return null;
    return {
      phoneTel: phone,
      phoneDisplay: phone,
      zaloUrl,
      websiteUrl,
    };
  }

  private canonicalPath(
    entityType: PublicCatalogItemProjection['entityType'],
    slug: string
  ): string {
    const prefix = {
      business: '/co-so',
      place: '/dia-diem',
      attraction: '/tien-ich',
      article: '/cam-nang',
      region: '/khu-vuc',
    }[entityType];
    return `${prefix}/${slug}`;
  }

  private safeHttpsUrl(value: string | null): string | null {
    if (!value || value.length > 2048) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && url.hostname
        ? value
        : null;
    } catch {
      return null;
    }
  }

  private safePublicMediaUrl(value: string | null): string | null {
    if (!value || value.length > 2048) return null;
    try {
      const url = new URL(value);
      const isLoopbackHttp =
        url.protocol === 'http:' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');
      return (url.protocol === 'https:' || isLoopbackHttp) &&
        !url.username &&
        !url.password &&
        url.hostname
        ? value
        : null;
    } catch {
      return null;
    }
  }

  private asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}
