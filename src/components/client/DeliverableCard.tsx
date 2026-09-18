import Link from "next/link";
import type { ClientDeliverable } from "@/shared/types/deliverable";
import { CLIENT_DELIVERABLE_STATUS_LABEL } from "@/shared/types/deliverable";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import { formatDateTime } from "@/lib/format/date";

const POSITIVE = new Set<ClientDeliverable["status"]>(["approved", "completed", "delivered"]);
const ATTENTION = new Set<ClientDeliverable["status"]>(["changes_requested", "waiting_for_approval"]);

// Stage 1 Phase 12 §34 — the version number is always shown alongside the
// name, so it's never ambiguous which version a card refers to.
export default function DeliverableCard({ deliverable }: { deliverable: ClientDeliverable }) {
  const tone = POSITIVE.has(deliverable.status) ? "positive" : ATTENTION.has(deliverable.status) ? "attention" : "neutral";

  return (
    <Link
      href={`/dashboard/deliverables/${deliverable.id}`}
      className="flex items-center justify-between gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-body text-sm text-bone">
          {deliverable.title} <span className="text-ash">· v{deliverable.version}</span>
        </span>
        <span className="font-body text-xs text-ash">
          {deliverable.type}
          {deliverable.serviceLabel ? ` · ${deliverable.serviceLabel}` : ""}
        </span>
        <span className="font-body text-xs text-ash">Updated {formatDateTime(deliverable.updatedAt)}</span>
      </div>
      <ClientStatusBadge label={CLIENT_DELIVERABLE_STATUS_LABEL[deliverable.status]} tone={tone} />
    </Link>
  );
}
