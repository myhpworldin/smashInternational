import "server-only";
import { ObjectId } from "mongodb";
import * as dailyRecordsRepo from "@/server/repositories/dailyPerformanceRecords.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import * as projectsRepo from "@/server/repositories/projects.repo";
import * as milestonesRepo from "@/server/repositories/milestones.repo";
import * as projectDeliverablesRepo from "@/server/repositories/projectDeliverables.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import { getMetricGroup } from "@/lib/performance/metricGroups";
import { resolvePeriod, previousEquivalentPeriod, type PeriodKey, type ResolvedPeriod } from "@/shared/analytics/period";
import {
  costPerLead,
  clickThroughRate,
  conversionRate,
  qualifiedRate,
  closeRate,
  appointmentRate,
  proposalRate,
  proposalCloseRate,
  revenuePerClosedDeal,
  comparePeriodValue,
} from "@/shared/analytics/derivedMetrics";
import type { PerformanceMetrics } from "@/shared/types/performance";
import type { DeliverableStatus, MilestoneStatus } from "@/shared/types/project";
import type {
  MetricTotals,
  DataFreshness,
  FreshnessStatus,
  PerformanceSummaryResult,
  PerformanceTrendPointResult,
  PeriodComparisonResult,
  ServiceBreakdownEntry,
  CampaignAnalysisResult,
  ProjectAnalysisResult,
  MilestoneAnalysis,
  DeliverableAnalysis,
} from "@/shared/types/analytics";

// Stage 1 Phase 20 — the aggregation/analysis engine built on top of
// Phase 19's dailyPerformanceRecords collection (the sole source of
// truth: §61, no parallel "dashboard leads" store). Every function here
// takes a plain `clientId` (never resolves a session itself), the same
// convention every Phase 16-19 service already uses — a client-facing
// route/page passes its own session-derived clientId, an admin
// route/page passes a clientId it already trusts, and this layer has no
// way to tell the difference (nor does it need to: ownership is enforced
// by the caller once, at the point a request-supplied id first meets a
// clientId — see getCampaignAnalysisForClient/getProjectAnalysisForClient
// below for the two places that actually happens).

// The full set of funnel/campaign metrics this engine aggregates —
// deliberately every key `getMetricGroup` can ever return, not a
// hardcoded subset, so a service's real applicable metrics (§34) are
// always exactly what gets summed and returned for it. "Interested" from
// the phase brief's funnel diagram has no corresponding stored field
// anywhere in this codebase (Phase 14/19 never collected it) — omitted
// rather than fabricated, per the project's honest-data convention.
const ALL_METRIC_KEYS = Object.keys({
  leads: 0,
  calls: 0,
  connectedCalls: 0,
  qualifiedLeads: 0,
  appointments: 0,
  proposals: 0,
  closedDeals: 0,
  revenue: 0,
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  postsPublished: 0,
  reelsPublished: 0,
  storiesPublished: 0,
  engagement: 0,
  followers: 0,
} satisfies Partial<Record<keyof PerformanceMetrics, number>>) as (keyof PerformanceMetrics)[];

function toMetricTotals(raw: Record<string, number | null>): MetricTotals {
  return raw as MetricTotals;
}

// §25 — one shared freshness classification, driven only by how many
// calendar days separate "now" from the latest reportingDate actually on
// file (never from updatedAt, which reflects when a correction was made,
// not which day the data describes).
function classifyFreshness(latestReportingDate: string | null, lastUpdatedAt: Date | null, today: string): DataFreshness {
  if (!latestReportingDate) {
    return { lastUpdatedAt: null, latestReportingDate: null, isCurrent: false, freshnessStatus: "NO_DATA" };
  }
  const daysOld = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestReportingDate}T00:00:00Z`)) / 86_400_000,
  );
  // "OUTDATED" is reserved for lastUpdatedAt-based staleness elsewhere;
  // for reportingDate-based freshness, a gap simply means the latest
  // recorded day is behind today (AWAITING_UPDATE), not that stale data
  // exists and is wrong.
  let freshnessStatus: FreshnessStatus;
  if (daysOld <= 0) freshnessStatus = "UPDATED_TODAY";
  else if (daysOld <= 3) freshnessStatus = "UPDATED_RECENTLY";
  else freshnessStatus = "AWAITING_UPDATE";

  return {
    lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : null,
    latestReportingDate,
    isCurrent: daysOld <= 0,
    freshnessStatus,
  };
}

function deriveRates(metrics: MetricTotals): PerformanceSummaryResult["derived"] {
  return {
    qualifiedRate: qualifiedRate(metrics.qualifiedLeads, metrics.leads),
    closeRate: closeRate(metrics.closedDeals, metrics.leads),
    appointmentRate: appointmentRate(metrics.appointments, metrics.qualifiedLeads),
    proposalRate: proposalRate(metrics.proposals, metrics.appointments),
    proposalCloseRate: proposalCloseRate(metrics.closedDeals, metrics.proposals),
    revenuePerClosedDeal: revenuePerClosedDeal(metrics.revenue, metrics.closedDeals),
    costPerLead: costPerLead(metrics.spend, metrics.leads),
    clickThroughRate: clickThroughRate(metrics.clicks, metrics.impressions),
  };
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// §7/§9 — client-wide summary for a resolved period, combining every
// engaged service's records. Meaningful because the underlying metric
// keys are additive-or-absent per service (a client with only a creative
// project has no marketing keys at all to combine); per-service
// breakdowns below still exist for when a caller needs the metrics kept
// separate (§10/§34).
export async function getPerformanceSummary(clientId: ObjectId, periodKey: PeriodKey, custom?: { start: string; end: string }): Promise<PerformanceSummaryResult> {
  const today = todayString();
  const period = resolvePeriod(periodKey, { today, customStart: custom?.start, customEnd: custom?.end });

  const result = await dailyRecordsRepo.aggregateRange(
    { clientId, startDate: period.startDate, endDate: period.endDate },
    ALL_METRIC_KEYS,
  );
  const metrics = toMetricTotals(result.metrics);

  return {
    period,
    hasData: result.recordCount > 0,
    metrics,
    derived: deriveRates(metrics),
    freshness: classifyFreshness(result.latestReportingDate, result.latestUpdatedAt, today),
  };
}

// §14 — chronologically ordered daily trend for the resolved period.
export async function getPerformanceTrend(
  clientId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<{ period: ResolvedPeriod; points: PerformanceTrendPointResult[] }> {
  const period = resolvePeriod(periodKey, { today: todayString(), customStart: custom?.start, customEnd: custom?.end });
  const buckets = await dailyRecordsRepo.aggregateDailyBuckets(
    { clientId, startDate: period.startDate, endDate: period.endDate },
    ALL_METRIC_KEYS,
  );

  return {
    period,
    points: buckets.map((b) => ({
      date: b.reportingDate,
      metrics: toMetricTotals(b.metrics),
      hasData: b.recordCount > 0,
    })),
  };
}

// §15 — current period vs. its comparable predecessor, with a null (not
// fabricated) percentChange whenever the previous value is zero/absent.
// "current_week"/"current_month" compare against the actual calendar
// previous_week/previous_month (§15's own worked example is calendar-
// aligned: "September 1-17 vs August 1-17" reads as current vs previous
// *month*, not an arbitrary 17-day lookback) — every other period key
// (today/yesterday/last_7_days/custom) has no such calendar anchor, so it
// falls back to the immediately preceding period of equal length.
function resolvePreviousPeriod(currentPeriod: ResolvedPeriod, periodKey: PeriodKey, today: string): ResolvedPeriod {
  if (periodKey === "current_month") return resolvePeriod("previous_month", { today });
  if (periodKey === "current_week") return resolvePeriod("previous_week", { today });
  return previousEquivalentPeriod(currentPeriod);
}

export async function getPerformanceComparison(
  clientId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<PeriodComparisonResult> {
  const today = todayString();
  const currentPeriod = resolvePeriod(periodKey, { today, customStart: custom?.start, customEnd: custom?.end });
  const previousPeriod = resolvePreviousPeriod(currentPeriod, periodKey, today);

  const [currentResult, previousResult] = await Promise.all([
    dailyRecordsRepo.aggregateRange({ clientId, startDate: currentPeriod.startDate, endDate: currentPeriod.endDate }, ALL_METRIC_KEYS),
    dailyRecordsRepo.aggregateRange({ clientId, startDate: previousPeriod.startDate, endDate: previousPeriod.endDate }, ALL_METRIC_KEYS),
  ]);

  const current = toMetricTotals(currentResult.metrics);
  const previous = toMetricTotals(previousResult.metrics);
  const difference: Partial<Record<keyof PerformanceMetrics, number | null>> = {};
  const percentChange: Partial<Record<keyof PerformanceMetrics, number | null>> = {};

  for (const key of ALL_METRIC_KEYS) {
    const diff = comparePeriodValue(current[key] ?? null, previous[key] ?? null);
    difference[key] = diff.difference;
    percentChange[key] = diff.percentChange;
  }

  return { currentPeriod, previousPeriod, current, previous, difference, percentChange };
}

// §10/§34 — one entry per service the client is actually engaged in,
// each restricted to that service's own applicable metric keys, so a
// Social Media row never carries a meaningless zeroed-out `leads` field.
export async function getServiceBreakdown(
  clientId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<ServiceBreakdownEntry[]> {
  const period = resolvePeriod(periodKey, { today: todayString(), customStart: custom?.start, customEnd: custom?.end });
  const engagements = await serviceEngagementsRepo.listByClientId(clientId);

  return Promise.all(
    engagements.map(async (engagement) => {
      const service = getServiceById(engagement.serviceId);
      const metricKeys = service ? getMetricGroup(service.id, service.category) : [];
      if (metricKeys.length === 0) {
        return {
          serviceId: engagement.serviceId,
          serviceLabel: service?.label ?? engagement.serviceId,
          metrics: {},
          hasData: false,
        };
      }
      const result = await dailyRecordsRepo.aggregateRange(
        { clientId, serviceId: engagement.serviceId, startDate: period.startDate, endDate: period.endDate },
        metricKeys,
      );
      return {
        serviceId: engagement.serviceId,
        serviceLabel: service?.label ?? engagement.serviceId,
        metrics: toMetricTotals(result.metrics),
        hasData: result.recordCount > 0,
      };
    }),
  );
}

async function computeCampaignAnalysis(
  campaign: Awaited<ReturnType<typeof campaignsRepo.findById>>,
  period: ResolvedPeriod,
): Promise<CampaignAnalysisResult | null> {
  if (!campaign) return null;
  const service = getServiceById(campaign.serviceId);
  const metricKeys = service ? getMetricGroup(service.id, service.category) : [];

  const result = await dailyRecordsRepo.aggregateRange(
    { clientId: campaign.clientId, campaignOrProjectId: campaign._id, startDate: period.startDate, endDate: period.endDate },
    metricKeys,
  );
  const metrics = toMetricTotals(result.metrics);

  return {
    campaignId: campaign._id.toHexString(),
    period,
    metrics,
    derived: {
      costPerLead: costPerLead(metrics.spend, metrics.leads),
      clickThroughRate: clickThroughRate(metrics.clicks, metrics.impressions),
      conversionRate: conversionRate(metrics.closedDeals, metrics.leads),
    },
    budget: campaign.budget,
    spend: campaign.spend,
    remaining: campaign.budget !== null ? Math.max(campaign.budget - campaign.spend, 0) : null,
    freshness: classifyFreshness(result.latestReportingDate, result.latestUpdatedAt, todayString()),
  };
}

// §11/§33/§42 — ownership-checked: a campaign id that exists but belongs
// to another client returns null, same as one that doesn't exist,
// identically to getCampaignForClient's existing ownership pattern.
export async function getCampaignAnalysisForClient(
  campaignId: string,
  clientId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<CampaignAnalysisResult | null> {
  if (!ObjectId.isValid(campaignId)) return null;
  const doc = await campaignsRepo.findById(new ObjectId(campaignId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return null;
  const period = resolvePeriod(periodKey, { today: todayString(), customStart: custom?.start, customEnd: custom?.end });
  return computeCampaignAnalysis(owned, period);
}

// Admin-side: the caller already has full access, no separate clientId to
// cross-check (same reasoning as updateProjectStatusForAdmin).
export async function getCampaignAnalysisForAdmin(
  campaignId: ObjectId,
  periodKey: PeriodKey,
  custom?: { start: string; end: string },
): Promise<CampaignAnalysisResult | null> {
  const doc = await campaignsRepo.findById(campaignId);
  if (!doc) return null;
  const period = resolvePeriod(periodKey, { today: todayString(), customStart: custom?.start, customEnd: custom?.end });
  return computeCampaignAnalysis(doc, period);
}

function analyzeMilestones(milestones: { status: MilestoneStatus }[]): MilestoneAnalysis {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "completed").length;
  const inProgress = milestones.filter((m) => m.status === "in_progress").length;
  const pending = milestones.filter((m) => m.status === "pending").length;
  return {
    total,
    completed,
    inProgress,
    pending,
    completionPercentage: total > 0 ? Math.round((completed / total) * 1000) / 10 : null,
  };
}

const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "planned",
  "in_progress",
  "ready_for_review",
  "approved",
  "changes_requested",
  "completed",
];

function analyzeDeliverables(deliverables: { status: DeliverableStatus }[]): DeliverableAnalysis {
  const byStatus = Object.fromEntries(DELIVERABLE_STATUSES.map((s) => [s, 0])) as Record<DeliverableStatus, number>;
  for (const d of deliverables) {
    byStatus[d.status] += 1;
  }
  return { total: deliverables.length, byStatus };
}

// Projects have no reportingDate concept (they're not daily-performance
// records) — freshness here is judged purely by how recently the project
// document itself was last touched, a deliberately simpler rule than
// classifyFreshness's reportingDate-based one above.
function classifyProjectFreshness(updatedAt: Date, today: string): DataFreshness {
  const daysOld = Math.round((Date.parse(`${today}T00:00:00Z`) - updatedAt.getTime()) / 86_400_000);
  let freshnessStatus: FreshnessStatus;
  if (daysOld <= 0) freshnessStatus = "UPDATED_TODAY";
  else if (daysOld <= 7) freshnessStatus = "UPDATED_RECENTLY";
  else freshnessStatus = "OUTDATED";

  return {
    lastUpdatedAt: updatedAt.toISOString(),
    latestReportingDate: null,
    isCurrent: daysOld <= 0,
    freshnessStatus,
  };
}

async function computeProjectAnalysis(
  project: Awaited<ReturnType<typeof projectsRepo.findById>>,
): Promise<ProjectAnalysisResult | null> {
  if (!project) return null;
  const [milestoneDocs, deliverableDocs] = await Promise.all([
    milestonesRepo.listByProjectId(project._id),
    projectDeliverablesRepo.listByProjectId(project._id),
  ]);
  const clientVisibleMilestones = milestoneDocs.filter((m) => m.clientVisible);
  const clientVisibleDeliverables = deliverableDocs.filter((d) => d.clientVisible);

  const milestoneAnalysis = analyzeMilestones(clientVisibleMilestones);
  const nextMilestone = clientVisibleMilestones.find((m) => m.status !== "completed") ?? null;

  return {
    projectId: project._id.toHexString(),
    status: project.status,
    progress: project.progress,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    targetEndDate: project.targetEndDate ? project.targetEndDate.toISOString() : null,
    currentStage: project.status,
    milestones: milestoneAnalysis,
    deliverables: analyzeDeliverables(clientVisibleDeliverables),
    nextMilestone: nextMilestone
      ? { id: nextMilestone._id.toHexString(), name: nextMilestone.title, status: nextMilestone.status }
      : null,
    // §22 — no due-date field exists anywhere in the Phase 17 project/
    // milestone/deliverable model, so "overdue" genuinely cannot be
    // calculated yet (§22's own rule: never infer a delay from missing
    // data). Freshness here is intentionally based on the project's own
    // updatedAt only, not a manufactured overdue signal.
    freshness: classifyProjectFreshness(project.updatedAt, todayString()),
  };
}

// §16/§17 — ownership-checked, same pattern as getCampaignAnalysisForClient.
export async function getProjectAnalysisForClient(
  projectId: string,
  clientId: ObjectId,
): Promise<ProjectAnalysisResult | null> {
  if (!ObjectId.isValid(projectId)) return null;
  const doc = await projectsRepo.findById(new ObjectId(projectId));
  const owned = assertClientOwnership(doc, clientId);
  return computeProjectAnalysis(owned);
}

export async function getProjectAnalysisForAdmin(projectId: ObjectId): Promise<ProjectAnalysisResult | null> {
  const doc = await projectsRepo.findById(projectId);
  return computeProjectAnalysis(doc);
}
