import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 5 §25 — the reusable "freshness" pattern for data later
// phases will populate manually (daily performance, reports, budget
// updates). Deliberately keeps reportingDate and updatedAt as two
// separate, independent props rather than one combined string: a later
// phase correcting yesterday's numbers today needs to show both without
// this component changing shape.
export default function DataTimestamp({
  reportingDate,
  updatedAt,
}: {
  reportingDate?: string | null;
  updatedAt?: string | null;
}) {
  if (!reportingDate && !updatedAt) return null;

  return (
    <div className="flex flex-col gap-0.5 font-body text-xs text-ash">
      {reportingDate && <span>Data for: {formatDateTime(reportingDate)}</span>}
      {updatedAt && <span>Last updated: {formatDateTime(updatedAt)}</span>}
    </div>
  );
}
