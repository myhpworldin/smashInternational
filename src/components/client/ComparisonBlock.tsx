import type { PerformanceComparison } from "@/shared/types/performance";
import { METRIC_LABEL, safeRatio } from "@/shared/types/performance";
import { formatMetricValue } from "@/lib/format/metric";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 10 §20 — a comparison with no previous-period value shows
// the required message verbatim rather than a blank/zero/"N/A".
export default function ComparisonBlock({ comparisons }: { comparisons: PerformanceComparison[] }) {
  if (comparisons.length === 0) {
    return <EmptyState message="No previous-period data available." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {comparisons.map((c) => {
        const delta = c.previous !== null ? c.current - c.previous : null;
        const changePct = c.previous ? safeRatio(delta ?? 0, c.previous) : null;

        return (
          <li key={c.metric} className="flex items-center justify-between border border-carbon px-3 py-2">
            <span className="font-body text-sm text-bone">{METRIC_LABEL[c.metric]}</span>
            {c.previous === null ? (
              <span className="font-body text-xs text-ash">No previous-period data available.</span>
            ) : (
              <span className="font-body text-xs text-ash">
                {formatMetricValue(c.metric, c.current)} vs {formatMetricValue(c.metric, c.previous)}
                {changePct !== null && (
                  <span className={changePct >= 0 ? "text-smash-text" : "text-ash"}>
                    {" "}
                    ({changePct >= 0 ? "+" : ""}
                    {changePct}%)
                  </span>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
