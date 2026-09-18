import Link from "next/link";
import type { ApprovalItem } from "@/shared/types/approval";
import { APPROVAL_STATUS_LABEL } from "@/shared/types/approval";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import { formatDateTime } from "@/lib/format/date";

const POSITIVE = new Set<ApprovalItem["status"]>(["approved", "completed"]);
const ATTENTION = new Set<ApprovalItem["status"]>(["awaiting_client", "changes_requested"]);

export default function ApprovalCard({ approval }: { approval: ApprovalItem }) {
  const tone = POSITIVE.has(approval.status) ? "positive" : ATTENTION.has(approval.status) ? "attention" : "neutral";

  return (
    <Link
      href={`/dashboard/approvals/${approval.id}`}
      className="flex items-center justify-between gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-body text-sm text-bone">{approval.title}</span>
        <span className="font-body text-xs text-ash">
          {approval.type}
          {approval.serviceLabel ? ` · ${approval.serviceLabel}` : ""}
        </span>
        <span className="font-body text-xs text-ash">Submitted {formatDateTime(approval.submittedAt)}</span>
      </div>
      <ClientStatusBadge label={APPROVAL_STATUS_LABEL[approval.status]} tone={tone} />
    </Link>
  );
}
