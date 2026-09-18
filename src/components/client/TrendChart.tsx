import type { PerformanceTrendPoint } from "@/shared/types/performance";
import { formatDateTime } from "@/lib/format/date";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 10 §9 — a plain, dependency-free bar chart: no charting
// library exists anywhere in this project (checked before building this),
// and introducing one for a chart that shows nothing in production today
// isn't justified (§9: "do not add unnecessary chart libraries"). Each
// bar carries its own accessible label (§27) — the visual bar is
// decorative, not the only way to read the value.
export default function TrendChart({ points, label }: { points: PerformanceTrendPoint[]; label: string }) {
  if (points.length === 0) {
    return <EmptyState message="No performance data available yet." />;
  }

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" role="img" aria-label={`${label} trend`}>
      {points.map((point) => (
        <div key={point.date} className="flex min-w-8 flex-1 flex-col items-center gap-1">
          <span className="sr-only">
            {formatDateTime(point.date)}: {point.value}
          </span>
          <div
            aria-hidden="true"
            className="w-full bg-smash"
            style={{ height: `${Math.max((point.value / max) * 96, 2)}px` }}
          />
          <span aria-hidden="true" className="font-body text-[10px] text-ash">
            {new Date(point.date).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}
