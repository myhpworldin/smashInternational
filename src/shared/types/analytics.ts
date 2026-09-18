import type { PerformanceMetrics } from "@/shared/types/performance";
import type { ResolvedPeriod } from "@/shared/analytics/period";
import type { DeliverableStatus, MilestoneStatus } from "@/shared/types/project";

// Stage 1 Phase 20 — the analysis-layer contracts, kept separate from
// Phase 19's DailyPerformanceRecord (the raw source of truth) so
// "activity data" and "aggregated analysis" are never the same shape
// (§3). Every metric total here is `number | null` rather than always
// `number`, specifically to preserve the "no data" vs "zero" distinction
// (§26/§27) all the way to the API response.
export type MetricTotals = Partial<Record<keyof PerformanceMetrics, number | null>>;

// §25 — one authoritative freshness vocabulary, reused by every summary
// response rather than each endpoint inventing its own staleness rule.
export type FreshnessStatus = "UPDATED_TODAY" | "UPDATED_RECENTLY" | "OUTDATED" | "AWAITING_UPDATE" | "NO_DATA";

export type DataFreshness = {
  lastUpdatedAt: string | null;
  latestReportingDate: string | null;
  isCurrent: boolean;
  freshnessStatus: FreshnessStatus;
};

export type PerformanceSummaryResult = {
  period: ResolvedPeriod;
  hasData: boolean;
  metrics: MetricTotals;
  derived: {
    qualifiedRate: number | null;
    closeRate: number | null;
    appointmentRate: number | null;
    proposalRate: number | null;
    proposalCloseRate: number | null;
    revenuePerClosedDeal: number | null;
    costPerLead: number | null;
    clickThroughRate: number | null;
  };
  freshness: DataFreshness;
};

export type PerformanceTrendPointResult = {
  date: string;
  metrics: MetricTotals;
  hasData: boolean;
};

export type PeriodComparisonResult = {
  currentPeriod: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  current: MetricTotals;
  previous: MetricTotals;
  difference: Partial<Record<keyof PerformanceMetrics, number | null>>;
  percentChange: Partial<Record<keyof PerformanceMetrics, number | null>>;
};

export type ServiceBreakdownEntry = {
  serviceId: string;
  serviceLabel: string;
  metrics: MetricTotals;
  hasData: boolean;
};

export type CampaignAnalysisResult = {
  campaignId: string;
  period: ResolvedPeriod;
  metrics: MetricTotals;
  derived: {
    costPerLead: number | null;
    clickThroughRate: number | null;
    conversionRate: number | null;
  };
  budget: number | null;
  spend: number;
  remaining: number | null;
  freshness: DataFreshness;
};

export type MilestoneAnalysis = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionPercentage: number | null;
};

export type DeliverableAnalysis = {
  total: number;
  byStatus: Record<DeliverableStatus, number>;
};

export type ProjectAnalysisResult = {
  projectId: string;
  status: string;
  progress: number | null;
  startDate: string | null;
  targetEndDate: string | null;
  currentStage: string;
  milestones: MilestoneAnalysis;
  deliverables: DeliverableAnalysis;
  nextMilestone: { id: string; name: string; status: MilestoneStatus } | null;
  freshness: DataFreshness;
};
