"use client";

import { useMemo, useState } from "react";
import type { PerformanceSnapshot, PerformanceMetrics } from "@/shared/types/performance";
import KpiCard from "@/components/client/KpiCard";
import TrendChart from "@/components/client/TrendChart";
import LeadFunnel from "@/components/client/LeadFunnel";
import CampaignPerformanceTable from "@/components/client/CampaignPerformanceTable";
import ServicePerformanceList from "@/components/client/ServicePerformanceList";
import ComparisonBlock from "@/components/client/ComparisonBlock";
import ClientSection from "@/components/client/ClientSection";
import EmptyState from "@/components/client/EmptyState";
import DataTimestamp from "@/components/client/DataTimestamp";

const KPI_ORDER: (keyof PerformanceMetrics)[] = [
  "leads",
  "calls",
  "qualifiedLeads",
  "appointments",
  "closedDeals",
  "revenue",
];

const DATE_PRESETS = ["Today", "Last 7 Days", "This Month", "Last Month"] as const;

// Stage 1 Phase 10 §10 — date-range presets are presentational only right
// now: there's no backend to actually refetch a different window against
// (the whole snapshot is server-fetched once, or is `null`), so changing
// the preset doesn't change anything yet. It's wired up correctly for the
// day a real backend can serve per-range snapshots — this component would
// then trigger a refetch here, nothing else about it would change. Service
// and campaign filters, by contrast, filter the already-fetched arrays
// client-side right now (§10 permits this: "frontend filtering may
// operate on the existing data contract/fixture until backend support is
// implemented later").
export default function PerformanceView({ snapshot }: { snapshot: PerformanceSnapshot | null }) {
  const [datePreset, setDatePreset] = useState<(typeof DATE_PRESETS)[number]>("Last 7 Days");
  const [serviceId, setServiceId] = useState("");

  const serviceOptions = useMemo(() => snapshot?.services.map((s) => ({ id: s.serviceId, label: s.serviceLabel })) ?? [], [snapshot]);

  const filteredCampaigns = useMemo(() => {
    if (!snapshot) return [];
    if (!serviceId) return snapshot.campaigns;
    // Campaign rows don't carry a serviceId in this frontend contract
    // (§5's conceptual shape keeps campaign performance flat) — until a
    // backend phase adds that link, the service filter only narrows the
    // Service Performance section below, not this table.
    return snapshot.campaigns;
  }, [snapshot, serviceId]);

  const filteredServices = useMemo(() => {
    if (!snapshot) return [];
    return serviceId ? snapshot.services.filter((s) => s.serviceId === serviceId) : snapshot.services;
  }, [snapshot, serviceId]);

  if (!snapshot) {
    return <EmptyState message="No performance data available yet." />;
  }

  const kpis = KPI_ORDER.filter((key) => snapshot.metrics[key] !== undefined);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              aria-pressed={datePreset === preset}
              className={`rounded-none border px-3 py-2 font-body text-xs focus-visible:-outline-offset-2 ${
                datePreset === preset ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-void text-ash"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {serviceOptions.length > 0 && (
          <select
            aria-label="Filter by service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
          >
            <option value="">All Services</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <DataTimestamp reportingDate={snapshot.freshness.reportingPeriodLabel} updatedAt={snapshot.freshness.updatedAt} />

      <ClientSection title="Key Performance Indicators">
        {kpis.length === 0 ? (
          <EmptyState message="No performance data available yet." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kpis.map((key) => (
              <KpiCard key={key} metric={key} value={snapshot.metrics[key] as number} />
            ))}
          </div>
        )}
      </ClientSection>

      <ClientSection title="Performance Trend">
        <TrendChart points={snapshot.trend} label="Leads" />
      </ClientSection>

      <ClientSection title="Lead Funnel">
        <LeadFunnel metrics={snapshot.metrics} />
      </ClientSection>

      <ClientSection title="Campaign Performance">
        <CampaignPerformanceTable rows={filteredCampaigns} />
      </ClientSection>

      <ClientSection title="Service Performance">
        <ServicePerformanceList services={filteredServices} />
      </ClientSection>

      <ClientSection title="Compared to Previous Period">
        <ComparisonBlock comparisons={snapshot.comparisons} />
      </ClientSection>
    </div>
  );
}
