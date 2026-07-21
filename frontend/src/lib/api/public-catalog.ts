import "server-only";

import type { RuntimeSchema } from "@/lib/api/schema";
import { serverApiRequest } from "@/lib/api/server-client";
import { encodePathSegment, type QueryParams } from "@/lib/api/url";

export const PUBLIC_CATALOG_KINDS = [
  "businesses",
  "places",
  "attractions",
  "articles",
  "regions",
] as const;

export const PUBLIC_REFERENCE_KINDS = [
  "business-types",
  "amenities",
  "article-categories",
  "attraction-categories",
  "regions",
] as const;

export type PublicCatalogKind = (typeof PUBLIC_CATALOG_KINDS)[number];
export type PublicReferenceKind = (typeof PUBLIC_REFERENCE_KINDS)[number];

/**
 * Response schemas remain supplied by feature modules so the boundary is tied
 * to the real backend DTO rather than an invented frontend-only contract.
 */
export function fetchPublicCatalog<T>(
  kind: PublicCatalogKind,
  schema: RuntimeSchema<T>,
  query?: QueryParams,
): Promise<T> {
  return serverApiRequest(
    `/api/v1/public/catalog/${encodePathSegment(kind, "catalog kind")}`,
    {
      method: "GET",
      cache: "no-store",
      query,
      schema,
    },
  );
}

export function fetchPublicCatalogDetail<T>(
  kind: PublicCatalogKind,
  slug: string,
  schema: RuntimeSchema<T>,
): Promise<T> {
  return serverApiRequest(
    `/api/v1/public/catalog/${encodePathSegment(kind, "catalog kind")}/${encodePathSegment(slug, "slug")}`,
    {
      method: "GET",
      cache: "no-store",
      schema,
    },
  );
}

export function fetchPublicReferences<T>(
  kind: PublicReferenceKind,
  schema: RuntimeSchema<T>,
): Promise<T> {
  return serverApiRequest(
    `/api/v1/public/references/${encodePathSegment(kind, "reference kind")}`,
    {
      method: "GET",
      cache: "no-store",
      schema,
    },
  );
}
