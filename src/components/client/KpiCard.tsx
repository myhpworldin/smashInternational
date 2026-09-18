import type { PerformanceMetrics } from "@/shared/types/performance";
import { METRIC_LABEL } from "@/shared/types/performance";
import { formatMetricValue } from "@/lib/format/metric";

// Stage 1 Phase 10 §4 — `change`/`periodLabel` are both optional: a KPI
// with no comparison data simply omits the change line (§20: never show
// a comparison that doesn't exist) rather than showing a fake "+0%".
export default function KpiCard({
  metric,
  value,
  change,
  periodLabel,
}: {
  metric: keyof PerformanceMetrics;
  value: number;
  change?: number | null;
  periodLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border border-carbon p-4">
      <span className="font-body text-xs tracking-[0.14em] text-ash uppercase">{METRIC_LABEL[metric]}</span>
      <span className="font-display text-xl text-bone">{formatMetricValue(metric, value)}</span>
      {typeof change === "number" && (
        <span className={`font-body text-xs ${change >= 0 ? "text-smash-text" : "text-ash"}`}>
          {change >= 0 ? "+" : ""}
          {change}% vs previous period
        </span>
      )}
      {periodLabel && <span className="font-body text-xs text-ash">{periodLabel}</span>}
    </div>
  );
}
