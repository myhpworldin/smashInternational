import type { CompletedHandoverRow } from "@/shared/types/handoverOverview";
import { formatDateTime } from "@/lib/format/date";

// Same responsive table/card split as AuditLogTable/UserTable (Phase 5
// §27) — desktop table, stacked cards under md.
export default function CompletedHandoverTable({ records }: { records: CompletedHandoverRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
              <th className="py-2 pr-4">Client</th>
              <th className="py-2 pr-4">Service</th>
              <th className="py-2 pr-4">Previous Staff</th>
              <th className="py-2 pr-4">New Staff</th>
              <th className="py-2 pr-4">Transferred By</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-carbon/60 text-bone">
                <td className="py-3 pr-4">{record.clientCompanyName}</td>
                <td className="py-3 pr-4">{record.serviceLabel}</td>
                <td className="py-3 pr-4 text-ash">{record.previousStaffName}</td>
                <td className="py-3 pr-4">{record.newStaffName}</td>
                <td className="py-3 pr-4 text-ash">{record.transferredByName}</td>
                <td className="py-3 pr-4 text-ash">{formatDateTime(new Date(record.transferredAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {records.map((record) => (
          <li key={record.id} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-sm text-bone">{record.serviceLabel}</span>
              <span className="font-body text-xs text-ash">{formatDateTime(new Date(record.transferredAt))}</span>
            </div>
            <div className="font-body text-xs text-ash">Client: {record.clientCompanyName}</div>
            <div className="font-body text-sm text-bone">
              <span className="text-ash">{record.previousStaffName}</span> → {record.newStaffName}
            </div>
            <div className="font-body text-xs text-ash">By {record.transferredByName}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
