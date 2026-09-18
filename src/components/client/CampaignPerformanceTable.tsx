import Link from "next/link";
import type { CampaignPerformanceRow } from "@/shared/types/performance";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";
import { formatMetricValue } from "@/lib/format/metric";
import { formatINR } from "@/lib/format/currency";

const METRIC_COLUMNS = ["leads", "cpl", "reach", "clicks", "ctr"] as const;

// Stage 1 Phase 10 §13 — desktop table / mobile cards, same responsive
// convention already used by admin/users/UserTable.tsx (hidden md:block
// table + a separate md:hidden card list), not a new pattern.
export default function CampaignPerformanceTable({ rows }: { rows: CampaignPerformanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No campaigns available for this service." />;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
              <th className="py-2 pr-4">Campaign</th>
              <th className="py-2 pr-4">Platform</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Budget</th>
              <th className="py-2 pr-4">Spend</th>
              {METRIC_COLUMNS.map((key) => (
                <th key={key} className="py-2 pr-4">
                  {key.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.campaignId} className="border-b border-carbon/60 text-bone">
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/campaigns/${row.campaignId}`} className="underline hover:text-ash">
                    {row.campaignName}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-ash">{row.platform ?? "—"}</td>
                <td className="py-3 pr-4">
                  <ClientStatusBadge label={row.status} tone="neutral" />
                </td>
                <td className="py-3 pr-4 text-ash">{row.budget !== undefined ? formatINR(row.budget) : "—"}</td>
                <td className="py-3 pr-4 text-ash">{row.spend !== undefined ? formatINR(row.spend) : "—"}</td>
                {METRIC_COLUMNS.map((key) => (
                  <td key={key} className="py-3 pr-4 text-ash">
                    {row.metrics[key] !== undefined ? formatMetricValue(key, row.metrics[key]!) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={row.campaignId} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/dashboard/campaigns/${row.campaignId}`} className="font-body text-sm text-bone underline">
                {row.campaignName}
              </Link>
              <ClientStatusBadge label={row.status} tone="neutral" />
            </div>
            <div className="grid grid-cols-2 gap-2 font-body text-xs text-ash">
              {row.platform && <span>Platform: {row.platform}</span>}
              {row.budget !== undefined && <span>Budget: {formatINR(row.budget)}</span>}
              {row.spend !== undefined && <span>Spend: {formatINR(row.spend)}</span>}
              {METRIC_COLUMNS.filter((key) => row.metrics[key] !== undefined).map((key) => (
                <span key={key}>
                  {key.toUpperCase()}: {formatMetricValue(key, row.metrics[key]!)}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
