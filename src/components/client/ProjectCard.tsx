import Link from "next/link";
import type { ClientProject } from "@/shared/types/project";
import { PROJECT_STATUS_LABEL } from "@/shared/types/project";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ProgressBar from "@/components/client/ProgressBar";
import { formatDateTime } from "@/lib/format/date";

const POSITIVE = new Set(["completed"]);
const ATTENTION = new Set(["changes_requested", "on_hold"]);

// Stage 1 Phase 9 §7 — takes the real ClientProject shape only; every
// optional field (progress, dates) is hidden rather than shown as a fake
// 0/blank when the data doesn't exist (§7: "if a data field is
// unavailable, don't display fake information").
export default function ProjectCard({ project }: { project: ClientProject }) {
  const tone = POSITIVE.has(project.status) ? "positive" : ATTENTION.has(project.status) ? "attention" : "neutral";

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="flex flex-col gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm text-bone">{project.name}</span>
          <span className="font-body text-xs text-ash">{project.serviceLabel}</span>
        </div>
        <ClientStatusBadge label={PROJECT_STATUS_LABEL[project.status]} tone={tone} />
      </div>

      {typeof project.progress === "number" && <ProgressBar value={project.progress} label="Progress" />}

      {(project.startDate || project.targetEndDate) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-body text-xs text-ash">
          {project.startDate && <span>Started {formatDateTime(project.startDate)}</span>}
          {project.targetEndDate && <span>Expected completion {formatDateTime(project.targetEndDate)}</span>}
        </div>
      )}
    </Link>
  );
}
