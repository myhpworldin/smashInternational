import Link from "next/link";
import type { ReportListItem } from "@/shared/types/report";
import { REPORT_TYPE_LABEL, REPORT_STATUS_LABEL } from "@/shared/types/report";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import DataTimestamp from "@/components/client/DataTimestamp";

const POSITIVE = new Set<ReportListItem["status"]>(["available"]);
const ATTENTION = new Set<ReportListItem["status"]>(["pending"]);

// Stage 1 Phase 11 §4 — never claims "Available" unless the report's own
// status says so (§24: "do not show Report Available if the data
// contract says the report is not available").
export default function ReportCard({ report }: { report: ReportListItem }) {
  const tone = POSITIVE.has(report.status) ? "positive" : ATTENTION.has(report.status) ? "attention" : "neutral";

  return (
    <Link
      href={`/dashboard/reports/${report.id}`}
      className="flex flex-col gap-2 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm text-bone">{report.title}</span>
          <span className="font-body text-xs text-ash">
            {REPORT_TYPE_LABEL[report.type]}
            {report.serviceLabel ? ` · ${report.serviceLabel}` : ""}
          </span>
        </div>
        <ClientStatusBadge label={REPORT_STATUS_LABEL[report.status]} tone={tone} />
      </div>

      <span className="font-body text-xs text-ash">{report.period.label}</span>

      {report.summary && <p className="font-body text-sm text-bone">{report.summary}</p>}

      <DataTimestamp reportingDate={null} updatedAt={report.updatedAt} />
    </Link>
  );
}
