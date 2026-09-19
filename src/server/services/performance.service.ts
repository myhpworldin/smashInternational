import "server-only";
import type { ObjectId } from "mongodb";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import { getServiceById } from "@/shared/config/services";
import {
  getPerformanceSummary,
  getPerformanceTrend,
  getPerformanceComparison,
  getServiceBreakdown,
} from "@/server/services/analytics.service";
import type {
  PerformanceSnapshot,
  PerformanceTrendPoint,
  PerformanceComparison,
  CampaignPerformanceRow,
  PerformanceMetrics,
} from "@/shared/types/performance";
import type { MetricTotals } from "@/shared/types/analytics";
import type { PeriodKey } from "@/shared/analytics/period";

// PerformanceMetrics (Phase 10) represents "not applicable" as an absent
// key (`undefined`), while the analysis engine's MetricTotals represents
// "never recorded in this range" as an explicit `null` (§26/§27) — this
// snapshot type predates that distinction, so nulls collapse to absent
// here rather than a fabricated 0.
function toPerformanceMetrics(totals: MetricTotals): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};
  for (const [key, value] of Object.entries(totals)) {
    if (value !== null && value !== undefined) {
      metrics[key as keyof PerformanceMetrics] = value;
    }
  }
  return metrics;
}

// Stage 1 Phase 20 — real aggregation, replacing the Phase 10 stub (which
// always returned null). Keeps the exact PerformanceSnapshot shape
// PerformancePage/PerformanceView already consume — no component needs to
// change. Default reporting window is the current calendar month; a later
// phase can expose period selection to the client UI without this
// function's shape changing.
//
// The trend series tracks `leads` specifically (the funnel's entry point
// and the one metric present across the widest range of services) rather
// than every metric at once, since PerformanceTrendPoint (Phase 10) is a
// single-value-per-date shape built for one KPI line chart.
const TREND_METRIC = "leads" as const;

// A handful of funnel-relevant metrics worth surfacing as period-over-
// period comparisons on the snapshot; a metric with no data in either
// period is left out rather than shown as a meaningless 0-vs-0 row.
const COMPARISON_METRICS = ["leads", "calls", "qualifiedLeads", "appointments", "proposals", "closedDeals", "revenue"] as const;

export async function getPerformanceForClient(clientId: ObjectId): Promise<PerformanceSnapshot | null> {
  return buildPerformanceSnapshot(clientId, "current_month");
}

// Stage 1 Phase 21 — factored out of getPerformanceForClient so report
// generation (reports.service.ts) can build the exact same
// PerformanceSnapshot shape for an arbitrary reporting period (a monthly
// report needs "the month being reported on," not always "the current
// month") without duplicating this assembly logic a second time.
export async function buildPerformanceSnapshot(
  clientId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<PerformanceSnapshot | null> {
  const engagements = await serviceEngagementsRepo.listByClientId(clientId);
  if (engagements.length === 0) return null;

  const [summary, trend, comparison, services, campaignDocs] = await Promise.all([
    getPerformanceSummary(clientId, periodKey, custom),
    getPerformanceTrend(clientId, periodKey, custom),
    getPerformanceComparison(clientId, periodKey, custom),
    getServiceBreakdown(clientId, periodKey, custom),
    campaignsRepo.listByClientId(clientId),
  ]);

  const trendPoints: PerformanceTrendPoint[] = trend.points
    .filter((p) => p.metrics[TREND_METRIC] !== null && p.metrics[TREND_METRIC] !== undefined)
    .map((p) => ({ date: p.date, value: p.metrics[TREND_METRIC] as number }));

  const comparisons: PerformanceComparison[] = COMPARISON_METRICS.filter(
    (key) => comparison.current[key] !== null || comparison.previous[key] !== null,
  ).map((key) => ({
    metric: key,
    current: comparison.current[key] ?? 0,
    previous: comparison.previous[key] ?? null,
  }));

  const campaigns: CampaignPerformanceRow[] = campaignDocs.map((doc) => ({
    campaignId: doc._id.toHexString(),
    campaignName: doc.name,
    platform: doc.platform ?? undefined,
    status: doc.status,
    budget: doc.budget ?? undefined,
    spend: doc.spend,
    // Campaign-level daily metrics are available via
    // analytics.service.ts's getCampaignAnalysisFor{Client,Admin} on
    // demand (§11) — this snapshot's own campaign row stays lightweight
    // (identity + budget only) since PerformanceSnapshot is meant as a
    // client-wide overview, not a per-campaign drill-down.
    metrics: {},
  }));

  return {
    freshness: { reportingPeriodLabel: summary.period.label, updatedAt: summary.freshness.lastUpdatedAt },
    metrics: toPerformanceMetrics(summary.metrics),
    trend: trendPoints,
    comparisons,
    campaigns,
    services: services
      .filter((s) => s.hasData)
      .map((s) => ({
        serviceId: s.serviceId,
        serviceLabel: getServiceById(s.serviceId)?.label ?? s.serviceLabel,
        metrics: toPerformanceMetrics(s.metrics),
      })),
  };
}
