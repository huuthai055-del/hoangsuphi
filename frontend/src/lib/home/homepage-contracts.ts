import type { HomepageModuleResult } from "./homepage-module-result";
import type { HarvestStage } from "./homepage-loaders";

export interface HarvestStatusData {
  regionName: string;
  regionSlug: string;
  stage: HarvestStage;
  stageLabel: string;
  stageTone: "neutral" | "growing" | "ripening" | "golden" | "harvesting";
  title: string;
  summary: string;
  observedAt: string;
  observedLabel?: string;
  image?: {
    url: string;
    altText?: string;
  };
}

export interface SeasonalNavigationItem {
  id: string;
  name: string;
  slug: string;
}

export interface ExploreSuggestionItem {
  id: string;
  name: string;
  slug: string;
  canonicalPath: string;
  summary?: string;
  regionName?: string;
  image?: {
    url: string;
    altText?: string;
  };
}

export interface FeaturedTopicItem {
  id: string;
  name: string;
  slug: string;
  href: string;
}

export interface HomepageModuleProps<T> {
  result?: HomepageModuleResult<T>;
}
