import type { ProjectDeliverable } from "@/shared/types/project";
import { DELIVERABLE_STATUS_LABEL } from "@/shared/types/project";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";

const POSITIVE = new Set(["approved", "completed"]);
const ATTENTION = new Set(["changes_requested"]);

// Stage 1 Phase 9 §13 — presentation only; approving/requesting changes on
// a deliverable is explicitly the later Approvals phase's job, not this
// one (this list has no action buttons at all).
export default function DeliverablesList({ deliverables }: { deliverables: ProjectDeliverable[] }) {
  if (deliverables.length === 0) {
    return <EmptyState message="No deliverables available yet." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {deliverables.map((d) => {
        const tone = POSITIVE.has(d.status) ? "positive" : ATTENTION.has(d.status) ? "attention" : "neutral";
        return (
          <li key={d.id} className="flex items-center justify-between gap-3 border border-carbon px-3 py-2">
            <span className="font-body text-sm text-bone">{d.name}</span>
            <ClientStatusBadge label={DELIVERABLE_STATUS_LABEL[d.status]} tone={tone} />
          </li>
        );
      })}
    </ul>
  );
}
