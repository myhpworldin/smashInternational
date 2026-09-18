"use client";

import { useState } from "react";
import type { StaffHandoverQueueRow } from "@/shared/types/serviceAssignment";
import type { AssignableStaffOption } from "@/server/services/adminUsers.service";
import { formatDateTime } from "@/lib/format/date";
import HandoverTransferControl from "@/components/admin/HandoverTransferControl";
import Toast from "@/components/admin/users/Toast";

// The bulk-review screen (Phase 3 §6/§9): every assignment this staff
// member currently has awaiting handover, across every client, on one
// page — each row still transfers independently through the same
// HandoverTransferControl Onboarding Detail uses, so nothing here
// bypasses per-assignment validation for the sake of a "bulk apply".
export default function StaffHandoverQueue({
  staffUserId,
  initialRows,
  assignableStaff,
}: {
  staffUserId: string;
  initialRows: StaffHandoverQueueRow[];
  assignableStaff: AssignableStaffOption[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refresh = async () => {
    const response = await fetch(`/api/admin/staff/${staffUserId}/handovers`);
    const data = await response.json().catch(() => null);
    if (data?.ok) {
      setRows(data.records as StaffHandoverQueueRow[]);
    }
  };

  if (rows.length === 0) {
    return (
      <>
        <p className="font-body text-sm text-ash">No active assignments require handover.</p>
        <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
      </>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 border border-white/15 bg-carbon p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-body text-sm text-bone">{row.serviceLabel}</span>
                <span className="font-body text-xs text-ash">Client: {row.clientCompanyName}</span>
              </div>
              <span className="border border-smash bg-smash-dim px-2 py-1 font-body text-xs uppercase text-bone">
                Handover Required
              </span>
            </div>

            <div className="font-body text-xs text-ash">
              <span>Current staff: {row.staffName}</span>
              {row.handoverRequiredAt && <span> · Since {formatDateTime(new Date(row.handoverRequiredAt))}</span>}
              {row.handoverReason && <span> · Reason: {row.handoverReason}</span>}
            </div>

            <HandoverTransferControl
              assignmentId={row.id}
              serviceLabel={row.serviceLabel}
              clientLabel={row.clientCompanyName}
              currentStaffName={row.staffName}
              eligibleStaff={assignableStaff}
              onTransferred={(message) => {
                setToastMessage(message);
                void refresh();
              }}
            />
          </li>
        ))}
      </ul>
      <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
    </>
  );
}
