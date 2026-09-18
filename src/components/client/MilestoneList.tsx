import type { ProjectMilestone } from "@/shared/types/project";
import { formatDateTime } from "@/lib/format/date";
import EmptyState from "@/components/client/EmptyState";

const MARK: Record<ProjectMilestone["status"], string> = {
  completed: "✓",
  in_progress: "●",
  pending: "○",
};

// Stage 1 Phase 9 §12 — status is never conveyed by color alone (§36): the
// ✓/●/○ mark and the text label both carry the same information.
export default function MilestoneList({ milestones }: { milestones: ProjectMilestone[] }) {
  if (milestones.length === 0) {
    return <EmptyState message="No milestones available yet." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {milestones.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 font-body text-sm">
          <span className="text-bone">
            <span aria-hidden="true" className="mr-2 text-smash-text">
              {MARK[m.status]}
            </span>
            {m.name}
          </span>
          <span className="text-xs text-ash">
            {m.status === "completed" && m.completedAt ? formatDateTime(m.completedAt) : m.status.replace("_", " ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
