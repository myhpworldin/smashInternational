import type { ServiceCategoryId } from "@/shared/config/services";
import type { PerformanceMetrics } from "@/shared/types/performance";

// Stage 1 Phase 13 §16 (extended Phase 14 §9) — which of Phase 10's
// PerformanceMetrics fields apply to a given service, so the daily-entry
// form only ever shows fields relevant to what's selected (never CPL on a
// Website Development entry, never ad-spend fields on organic Social
// Media Management). Deliberately reuses the existing PerformanceMetrics
// shape rather than inventing new per-category metric types —
// creative/technology services are project-tracked (project-progress
// entry), not performance-metric-tracked, so they intentionally have no
// group here.
//
// Checked by exact serviceId first, then category, because
// "social_media_management" (organic) and "meta_ads"/"google_ads"/
// "social_media_advertising" (paid) all share the same digital_marketing
// category but need entirely different fields — a category-only lookup
// can't tell them apart.
const SOCIAL_METRICS: (keyof PerformanceMetrics)[] = [
  "postsPublished",
  "reelsPublished",
  "storiesPublished",
  "reach",
  "engagement",
  "followers",
  "engagementRate",
];

const ADVERTISING_METRICS: (keyof PerformanceMetrics)[] = [
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "spend",
  "cpl",
  "cpc",
  "cpa",
  "conversionRate",
];

const LEAD_MANAGEMENT_METRICS: (keyof PerformanceMetrics)[] = [
  "leads",
  "calls",
  "connectedCalls",
  "qualifiedLeads",
  "appointments",
  "proposals",
  "closedDeals",
  "revenue",
];

const METRIC_GROUP_BY_SERVICE_ID: Partial<Record<string, (keyof PerformanceMetrics)[]>> = {
  social_media_management: SOCIAL_METRICS,
};

const METRIC_GROUP_BY_CATEGORY: Partial<Record<ServiceCategoryId, (keyof PerformanceMetrics)[]>> = {
  digital_marketing: ADVERTISING_METRICS,
  customer_engagement: LEAD_MANAGEMENT_METRICS,
};

export function getMetricGroup(serviceId: string, category: ServiceCategoryId): (keyof PerformanceMetrics)[] {
  return METRIC_GROUP_BY_SERVICE_ID[serviceId] ?? METRIC_GROUP_BY_CATEGORY[category] ?? [];
}

// Kept for Phase 13's existing callers — same category-only behavior as
// before this phase added the serviceId-level override.
export const METRIC_GROUPS_BY_CATEGORY = METRIC_GROUP_BY_CATEGORY;
