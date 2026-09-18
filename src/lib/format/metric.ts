import { formatINR } from "@/lib/format/currency";
import { CURRENCY_METRIC_KEYS, PERCENT_METRIC_KEYS, type PerformanceMetrics } from "@/shared/types/performance";

// Stage 1 Phase 10 — one formatter for every metric value across
// KpiCard/CampaignPerformanceTable/ServicePerformanceSummary, so currency
// vs. percentage vs. plain-count formatting can't drift between them.
export function formatMetricValue(key: keyof PerformanceMetrics, value: number): string {
  if (CURRENCY_METRIC_KEYS.includes(key)) return formatINR(value);
  if (PERCENT_METRIC_KEYS.includes(key)) return `${value}%`;
  return value.toLocaleString("en-IN");
}
