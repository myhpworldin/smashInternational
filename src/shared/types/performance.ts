// Stage 1 Phase 10 — the client-facing performance data contract (§5).
// No performance backend/collection exists anywhere in this codebase yet
// (see server/services/performance.service.ts, which returns empty/null
// in production) — every field here is optional for exactly that reason:
// a client whose only service is Website Development has no marketing
// metrics at all, and the UI must not invent zeros to fill the shape.
export type PerformanceMetrics = {
  leads?: number;
  calls?: number;
  connectedCalls?: number;
  qualifiedLeads?: number;
  appointments?: number;
  proposals?: number;
  closedDeals?: number;
  revenue?: number;
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpl?: number;
  cpc?: number;
  cpa?: number;
  conversionRate?: number;
  // Stage 1 Phase 14 §9 — organic social metrics, distinct from paid
  // advertising (impressions/clicks/spend above): Social Media Management
  // has no ad spend to report against. Added here rather than a second
  // metrics type so every existing consumer (KpiCard, ServicePerformanceList,
  // reports) keeps working against one shape — these fields are simply
  // absent for every non-social service, same as any other optional field.
  postsPublished?: number;
  reelsPublished?: number;
  storiesPublished?: number;
  engagement?: number;
  followers?: number;
  engagementRate?: number;
};

export const METRIC_LABEL: Record<keyof PerformanceMetrics, string> = {
  leads: "Leads",
  calls: "Calls",
  connectedCalls: "Connected Calls",
  qualifiedLeads: "Qualified Leads",
  appointments: "Appointments",
  proposals: "Proposals",
  closedDeals: "Closed Deals",
  revenue: "Revenue",
  spend: "Spend",
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Clicks",
  ctr: "CTR",
  cpl: "CPL",
  cpc: "CPC",
  cpa: "CPA",
  conversionRate: "Conversion Rate",
  postsPublished: "Posts Published",
  reelsPublished: "Reels Published",
  storiesPublished: "Stories Published",
  engagement: "Engagement",
  followers: "Followers",
  engagementRate: "Engagement Rate",
};

// Metrics whose value is a currency amount vs. a plain/percentage number
// — MetricValue (components/client) uses this to decide formatINR vs a
// bare number/percent suffix, so no component hardcodes this list itself.
export const CURRENCY_METRIC_KEYS: (keyof PerformanceMetrics)[] = ["revenue", "spend", "cpl", "cpc", "cpa"];
export const PERCENT_METRIC_KEYS: (keyof PerformanceMetrics)[] = ["ctr", "conversionRate", "engagementRate"];

export type PerformanceTrendPoint = { date: string; value: number };

// Deliberately two separate timestamps (§22/§36) — reportingPeriod is
// what the numbers describe, updatedAt is when they were last entered.
// The frontend must never collapse these into one "as of" string, even
// once a real backend starts populating both.
export type PerformanceFreshness = {
  reportingPeriodLabel: string;
  updatedAt: string | null;
};

export type PerformanceComparison = {
  metric: keyof PerformanceMetrics;
  current: number;
  previous: number | null;
};

export type CampaignPerformanceRow = {
  campaignId: string;
  campaignName: string;
  platform?: string;
  status: string;
  budget?: number;
  spend?: number;
  metrics: PerformanceMetrics;
};

export type ServicePerformanceSummary = {
  serviceId: string;
  serviceLabel: string;
  metrics: PerformanceMetrics;
};

export type PerformanceSnapshot = {
  freshness: PerformanceFreshness;
  metrics: PerformanceMetrics;
  trend: PerformanceTrendPoint[];
  comparisons: PerformanceComparison[];
  campaigns: CampaignPerformanceRow[];
  services: ServicePerformanceSummary[];
};

// Safe division for frontend-derived funnel/conversion percentages (§8) —
// never NaN/Infinity: a zero or missing denominator (or numerator) yields
// `null`, which every caller renders as "—", not a broken number.
export function safeRatio(numerator: number | undefined, denominator: number | undefined): number | null {
  if (!numerator || !denominator) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const ratio = (numerator / denominator) * 100;
  return Number.isFinite(ratio) ? Math.round(ratio * 10) / 10 : null;
}
