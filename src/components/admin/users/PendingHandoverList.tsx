import Link from "next/link";
import type { PendingHandoverStaffRow } from "@/shared/types/handoverOverview";
import { STAFF_AVAILABILITY_LABEL } from "@/shared/types/adminUser";
import { formatDateTime } from "@/lib/format/date";

// One card per staff member requiring review (Phase 5 §5) — deliberately
// cards, not a table, since the useful unit here is "go manage this
// person's handover," not a row of comparable columns; each links
// straight into the per-staff detail view already built in Phase 3
// (/admin/staff/[id]/handover), which is where the actual
// replacement-selection happens.
export default function PendingHandoverList({ rows }: { rows: PendingHandoverStaffRow[] }) {
  if (rows.length === 0) {
    return <p className="font-body text-sm text-ash">No staff members currently require handover.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={row.staffUserId}
          className={`flex flex-col gap-2 border p-4 transition-colors duration-150 ${
            row.pendingCount > 0 ? "border-smash bg-smash-dim" : "border-white/15 bg-carbon"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-body text-sm text-bone">{row.name}</span>
              <span className="font-body text-xs text-ash">{row.email}</span>
            </div>
            <span className="border border-white/15 bg-void px-2 py-1 font-body text-xs uppercase text-bone">
              {STAFF_AVAILABILITY_LABEL[row.availability]}
            </span>
          </div>

          {row.pendingCount > 0 ? (
            <p className="font-body text-xs text-bone">
              ⚠ {row.pendingCount} assignment{row.pendingCount === 1 ? "" : "s"} require
              {row.pendingCount === 1 ? "s" : ""} a replacement
              {row.transferredCount > 0 ? ` · ${row.transferredCount} already transferred` : ""}
              {row.earliestHandoverRequiredAt
                ? ` · since ${formatDateTime(new Date(row.earliestHandoverRequiredAt))}`
                : ""}
            </p>
          ) : (
            <p className="font-body text-xs text-ash">
              Handover complete — all {row.transferredCount} assignment{row.transferredCount === 1 ? "" : "s"}{" "}
              transferred.
            </p>
          )}

          <Link
            href={`/admin/staff/${row.staffUserId}/handover`}
            className="self-start rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 focus-visible:-outline-offset-2"
          >
            {row.pendingCount > 0 ? "Manage Handover" : "View Handover"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
