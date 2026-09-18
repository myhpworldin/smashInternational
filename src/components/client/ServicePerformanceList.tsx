import type { ServicePerformanceSummary } from "@/shared/types/performance";
import { METRIC_LABEL } from "@/shared/types/performance";
import { formatMetricValue } from "@/lib/format/metric";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 10 §19 — each service only ever renders the metric keys
// actually present in its own `metrics` object, so a non-advertising
// service (e.g. Website Development) never shows a Meta-style spend/CPL
// row it has no data for.
export default function ServicePerformanceList({ services }: { services: ServicePerformanceSummary[] }) {
  if (services.length === 0) {
    return <EmptyState message="No performance data available yet." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {services.map((service) => {
        const entries = Object.entries(service.metrics).filter(([, v]) => v !== undefined) as [
          keyof typeof METRIC_LABEL,
          number,
        ][];

        return (
          <div key={service.serviceId} className="flex flex-col gap-2 border border-carbon p-4">
            <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{service.serviceLabel}</h3>
            {entries.length === 0 ? (
              <p className="font-body text-sm text-ash">No performance data available yet.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {entries.map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <dt className="font-body text-xs text-ash">{METRIC_LABEL[key]}</dt>
                    <dd className="font-body text-sm text-bone">{formatMetricValue(key, value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
