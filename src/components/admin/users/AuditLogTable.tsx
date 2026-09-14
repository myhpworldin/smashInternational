import Link from "next/link";
import type { AuditLogRow } from "@/shared/types/auditLog";
import { AUDIT_ACTION_LABEL } from "@/shared/types/auditLog";
import { formatDateTime } from "@/lib/format/date";

const DESTRUCTIVE_ACTIONS = new Set(["user_blocked", "password_reset_by_admin"]);

function ActionBadge({ action }: { action: AuditLogRow["action"] }) {
  const destructive = DESTRUCTIVE_ACTIONS.has(action);
  return (
    <span
      className={`border px-2 py-1 font-body text-xs uppercase ${
        destructive ? "border-smash bg-smash-dim text-bone" : "border-carbon bg-carbon text-bone"
      }`}
    >
      {AUDIT_ACTION_LABEL[action]}
    </span>
  );
}

// Two renderings of the same rows — a table for desktop, stacked cards
// for mobile — same split OnboardingTable/UserTable already use (Phase 7
// spec §11: responsive layout, compact information hierarchy).
export default function AuditLogTable({ records }: { records: AuditLogRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Admin</th>
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-carbon/60 text-bone">
                <td className="py-3 pr-4">
                  <ActionBadge action={record.action} />
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span className="text-bone">{record.actorName}</span>
                    <span className="text-xs text-ash">{record.actorEmail}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span className="text-bone">{record.targetName}</span>
                    <span className="text-xs text-ash">{record.targetEmail}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-ash">{formatDateTime(record.createdAt)}</td>
                <td className="py-3">
                  <Link
                    href={`/admin/users/audit-log/${record.id}`}
                    className="text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {records.map((record) => (
          <li key={record.id} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex items-center justify-between gap-2">
              <ActionBadge action={record.action} />
              <span className="font-body text-xs text-ash">{formatDateTime(record.createdAt)}</span>
            </div>
            <div className="font-body text-sm text-bone">
              <span className="text-ash">Admin: </span>
              {record.actorName}
            </div>
            <div className="font-body text-sm text-bone">
              <span className="text-ash">Target: </span>
              {record.targetName}
            </div>
            <Link
              href={`/admin/users/audit-log/${record.id}`}
              className="self-start font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
            >
              Details
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
