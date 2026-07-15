import type { SearchResultDto } from '../dto/search.dto';
import type { SearchReadProjection } from '../repository/search-read-model';

const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};
const PUBLIC_RATING_PATTERN = /^(?:[1-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/;
const PUBLIC_PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export class SearchProjectionInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchProjectionInvariantError';
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/giu, (match, decimal, hex, named) => {
    if (typeof decimal === 'string') {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : ' ';
    }
    if (typeof hex === 'string') {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : ' ';
    }
    if (typeof named === 'string') return NAMED_HTML_ENTITIES[named.toLowerCase()] ?? match;
    return match;
  });
}

export function toPlainTextSummary(source: string | null): string | null {
  if (source === null) return null;
  const decoded = decodeHtmlEntities(source);
  const plainText = decoded
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/[<>]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([,.;:!?])/gu, '$1')
    .trim()
    .normalize('NFC');
  if (plainText.length === 0) return null;
  return Array.from(plainText).slice(0, 500).join('');
}

function toPublicRating(value: string | null): number | null {
  if (value === null) return null;
  if (!PUBLIC_RATING_PATTERN.test(value)) {
    throw new SearchProjectionInvariantError('Search rating precision is invalid');
  }
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new SearchProjectionInvariantError('Search rating projection is invalid');
  }
  return rating;
}

function toPublicRelevance(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new SearchProjectionInvariantError('Search relevance projection is invalid');
  }
  return value;
}

function toPublicPrice(value: string | null): string | null {
  if (value === null) return null;
  if (!PUBLIC_PRICE_PATTERN.test(value)) {
    throw new SearchProjectionInvariantError('Search price projection is invalid');
  }
  return value;
}

function toPublicThumbnailUrl(value: string | null): string | null {
  if (value === null || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.hostname.length === 0
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function mapSearchProjection(item: SearchReadProjection): SearchResultDto {
  return {
    entityType: item.entityType,
    id: item.id,
    name: item.name,
    slug: item.slug,
    summary: toPlainTextSummary(item.summarySource),
    thumbnailUrl: toPublicThumbnailUrl(item.thumbnailCandidate),
    region: item.region ? { ...item.region } : null,
    category: item.category ? { ...item.category } : null,
    rating: toPublicRating(item.rating),
    priceMin: toPublicPrice(item.priceMin),
    priceMax: toPublicPrice(item.priceMax),
    relevance: toPublicRelevance(item.relevance),
  };
}
