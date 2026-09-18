"use client";

import { useMemo, useState } from "react";
import type { ReportListItem } from "@/shared/types/report";
import { REPORT_TYPE_LABEL, REPORT_STATUS_LABEL } from "@/shared/types/report";
import ReportCard from "@/components/client/ReportCard";
import EmptyState from "@/components/client/EmptyState";

export default function ReportsListClient({ reports }: { reports: ReportListItem[] }) {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");

  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const r of reports) if (r.serviceLabel) seen.add(r.serviceLabel);
    return [...seen];
  }, [reports]);

  const filtered = reports.filter((r) => {
    if (type && r.type !== type) return false;
    if (status && r.status !== status) return false;
    if (service && r.serviceLabel !== service) return false;
    return true;
  });

  if (reports.length === 0) {
    return (
      <EmptyState message="Your reports will appear here once SMASH has prepared them." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by report type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
        >
          <option value="">All Types</option>
          {Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
        >
          <option value="">All Statuses</option>
          {Object.entries(REPORT_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {serviceOptions.length > 0 && (
          <select
            aria-label="Filter by service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
          >
            <option value="">All Services</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No reports match your filters." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <ReportCard report={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
