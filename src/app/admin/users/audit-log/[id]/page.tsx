import Link from "next/link";
import { requireRole } from "@/server/auth/dal";
import { getAuditLogForAdmin } from "@/server/services/auditLog.service";
import { AUDIT_ACTION_LABEL } from "@/shared/types/auditLog";
import { formatDateTime } from "@/lib/format/date";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-carbon pb-3">
      <span className="font-body text-xs text-ash uppercase">{label}</span>
      <span className="font-body text-sm text-bone">{value}</span>
    </div>
  );
}

// Metadata rendered generically (key: value, one per line) — each action
// puts only non-secret facts in there (see the audit.record() calls in
// adminUsers.service.ts / auth.service.ts), so there's nothing here that
// needs per-action-specific rendering to stay safe.
function MetadataList({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return <p className="font-body text-sm text-ash">No additional metadata for this event.</p>;
  }
  return (
    <dl className="flex flex-col gap-2 font-body text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4 border-b border-carbon pb-2">
          <dt className="text-ash">{key}</dt>
          <dd className="text-bone">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AuditLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const record = await getAuditLogForAdmin(id);
  if (!record) {
    return (
      <main className="px-6 py-10 md:px-10">
        <p className="font-body text-sm text-smash-text">That audit record doesn&apos;t exist.</p>
        <Link href="/admin/users/audit-log" className="mt-2 inline-block font-body text-sm text-ash underline">
          Back to audit log
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/users/audit-log"
          className="self-start font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
        >
          Back to audit log
        </Link>
        <h1 className="font-display text-xl text-bone">{AUDIT_ACTION_LABEL[record.action]}</h1>
      </div>

      <div className="flex flex-col gap-4 border border-carbon p-6">
        <Field label="Admin" value={`${record.actorName} (${record.actorEmail})`} />
        <Field label="Action" value={AUDIT_ACTION_LABEL[record.action]} />
        <Field label="Target" value={`${record.targetName} (${record.targetEmail})`} />
        <Field label="Target role" value={record.targetRole === "admin" ? "Admin" : "Client"} />
        <Field label="Date" value={formatDateTime(record.createdAt)} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-sm text-bone">Details</h2>
        <MetadataList metadata={record.metadata} />
      </div>
    </main>
  );
}
