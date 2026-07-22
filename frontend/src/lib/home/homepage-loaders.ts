import "server-only";

import { cache } from "react";
import { z } from "zod";
import { serverApiRequest } from "@/lib/api/server-client";
import { loadHomepageModule, type HomepageModuleResult } from "@/lib/home/homepage-module-result";
import type {
  ExploreSuggestionItem,
  FeaturedTopicItem,
  HarvestStatusData,
  SeasonalNavigationItem,
} from "@/lib/home/homepage-contracts";

const harvestStageEnum = z.enum([
  "PREPARING",
  "TRANSPLANTING",
  "GREEN",
  "RIPENING",
  "GOLDEN",
  "HARVESTING",
  "OFF_SEASON",
]);

export type HarvestStage = z.infer<typeof harvestStageEnum>;

export const HARVEST_STAGE_LABELS: Record<HarvestStage, string> = {
  PREPARING: "Đang làm đất",
  TRANSPLANTING: "Đang cấy lúa",
  GREEN: "Lúa xanh mướt",
  RIPENING: "Lúa chớm chín",
  GOLDEN: "Lúa chín vàng",
  HARVESTING: "Đang gặt hái",
  OFF_SEASON: "Thời gian nghỉ mùa",
};

export const HARVEST_STAGE_TONES: Record<
  HarvestStage,
  "neutral" | "growing" | "ripening" | "golden" | "harvesting"
> = {
  PREPARING: "neutral",
  TRANSPLANTING: "growing",
  GREEN: "growing",
  RIPENING: "ripening",
  GOLDEN: "golden",
  HARVESTING: "harvesting",
  OFF_SEASON: "neutral",
};

const harvestMediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  altText: z.string().nullable(),
  variant: z.string().optional(),
});

const harvestPublicItemSchema = z.object({
  region: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    level: z.number().int().optional(),
  }),
  current: z.object({
    id: z.string().uuid(),
    stage: harvestStageEnum,
    observedAt: z.string(),
    title: z.string().min(1),
    summary: z.string().min(1),
    advisory: z.string().nullable().optional(),
    publishedAt: z.string(),
    media: z.array(harvestMediaSchema).optional().default([]),
  }),
});

const harvestStatusResponseSchema = z.object({
  data: z.array(harvestPublicItemSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

const publicReferenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

const publicReferencesResponseSchema = z.object({
  data: z.array(publicReferenceSchema),
  meta: z.object({ totalReturned: z.number().int().nonnegative() }),
  error: z.null(),
});

const publicCatalogItemSchema = z.object({
  kind: z.string(),
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable().optional(),
  canonicalPath: z.string().min(1),
  region: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      slug: z.string().min(1),
    })
    .nullable()
    .optional(),
  image: z
    .object({
      url: z.string().url(),
      altText: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const publicCatalogResponseSchema = z.object({
  data: z.array(publicCatalogItemSchema).max(6),
  meta: z.object({
    cursor: z.string().nullable().optional(),
    nextCursor: z.string().nullable().optional(),
    hasMore: z.boolean().optional(),
    totalReturned: z.number().int().min(0).max(6),
  }),
  error: z.null(),
});

const referenceCache = {
  cache: "force-cache" as const,
  next: { revalidate: 300 },
};

/** React cache deduplicated loader for Harvest Status. */
const loadHarvestStatusRaw = cache(async () => {
  return serverApiRequest("/api/v1/harvest-status", {
    method: "GET",
    cache: "no-store",
    schema: harvestStatusResponseSchema,
    timeoutMs: 3000,
  });
});

/** Formats ISO string into a safe Vietnamese date string */
export function formatHarvestDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

/** Fetches current harvest status module, deduplicated per RSC request */
export async function fetchHarvestStatusModule(): Promise<
  HomepageModuleResult<HarvestStatusData>
> {
  return loadHomepageModule(async () => {
    const response = await loadHarvestStatusRaw();
    const firstItem = response.data[0];
    if (!firstItem) return null;

    const { region, current } = firstItem;
    const stageLabel = HARVEST_STAGE_LABELS[current.stage] ?? "Chưa xác định";
    const stageTone = HARVEST_STAGE_TONES[current.stage] ?? "neutral";
    const formattedDate = formatHarvestDate(current.observedAt);
    const mediaImage = current.media[0]
      ? { url: current.media[0].url, altText: current.media[0].altText ?? current.title }
      : undefined;

    return {
      regionName: region.name,
      regionSlug: region.slug,
      stage: current.stage,
      stageLabel,
      stageTone,
      title: current.title,
      summary: current.summary,
      observedAt: current.observedAt,
      observedLabel: formattedDate ? `Cập nhật ngày ${formattedDate}` : undefined,
      image: mediaImage,
    };
  });
}

/** Seasonal navigation is backed by the public Regions reference projection. */
export async function fetchSeasonalNavigationModule(): Promise<
  HomepageModuleResult<SeasonalNavigationItem[]>
> {
  return loadHomepageModule(async () => {
    const response = await serverApiRequest("/api/v1/public/references/regions", {
      method: "GET",
      ...referenceCache,
      schema: publicReferencesResponseSchema,
      timeoutMs: 3000,
    });
    return response.data.map(({ id, name, slug }) => ({ id, name, slug }));
  });
}

/** Homepage explore suggestions: Calls GET /api/v1/public/catalog/places?sort=newest&limit=6 with no-store */
export async function fetchExploreSuggestionsModule(): Promise<
  HomepageModuleResult<ExploreSuggestionItem[]>
> {
  return loadHomepageModule(async () => {
    const response = await serverApiRequest("/api/v1/public/catalog/places", {
      method: "GET",
      cache: "no-store",
      query: { sort: "newest", limit: 6 },
      schema: publicCatalogResponseSchema,
      timeoutMs: 3000,
    });
    return response.data.map((place) => ({
      id: place.id,
      name: place.name,
      slug: place.slug,
      canonicalPath: place.canonicalPath || `/dia-diem/${place.slug}`,
      summary: place.summary ?? undefined,
      regionName: place.region?.name ?? undefined,
      image: place.image
        ? { url: place.image.url, altText: place.image.altText ?? place.name }
        : undefined,
    }));
  });
}

/** Featured topics are public attraction-category references, cached with SWR (300s). */
export async function fetchFeaturedTopicsModule(): Promise<
  HomepageModuleResult<FeaturedTopicItem[]>
> {
  return loadHomepageModule(async () => {
    const response = await serverApiRequest(
      "/api/v1/public/references/attraction-categories",
      {
        method: "GET",
        ...referenceCache,
        schema: publicReferencesResponseSchema,
        timeoutMs: 3000,
      }
    );
    return response.data.map(({ id, name, slug }) => ({
      id,
      name,
      slug,
      href: `/tim-kiem?q=${encodeURIComponent(name)}`,
    }));
  });
}
