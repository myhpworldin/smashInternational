import type { PerformanceMetrics } from "@/shared/types/performance";
import { METRIC_LABEL, safeRatio } from "@/shared/types/performance";
import EmptyState from "@/components/client/EmptyState";

const FUNNEL_ORDER: (keyof PerformanceMetrics)[] = [
  "leads",
  "calls",
  "connectedCalls",
  "qualifiedLeads",
  "appointments",
  "proposals",
  "closedDeals",
];

// Stage 1 Phase 10 §7/§8 — only stages the caller actually has data for
// are shown (§7: "support stages even if some stages have no data" means
// don't crash/misalign, not "render a fake zero for every stage"); the
// conversion rate between two consecutive shown stages uses safeRatio, so
// a zero or missing denominator always renders "—", never NaN/Infinity.
export default function LeadFunnel({ metrics }: { metrics: PerformanceMetrics }) {
  const stages = FUNNEL_ORDER.filter((key) => typeof metrics[key] === "number");

  if (stages.length === 0) {
    return <EmptyState message="No performance data available yet." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {stages.map((key, index) => {
        const value = metrics[key] as number;
        const previousKey = index > 0 ? stages[index - 1] : null;
        const conversion = previousKey ? safeRatio(value, metrics[previousKey]) : null;

        return (
          <li key={key} className="flex items-center justify-between border border-carbon px-3 py-2">
            <span className="font-body text-sm text-bone">{METRIC_LABEL[key]}</span>
            <span className="flex items-baseline gap-3">
              <span className="font-display text-base text-bone">{value.toLocaleString("en-IN")}</span>
              {conversion !== null && (
                <span className="font-body text-xs text-ash">{conversion}% from {METRIC_LABEL[previousKey!]}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
