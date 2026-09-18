import type { ProjectTimelineEvent } from "@/shared/types/project";
import { formatDateTime } from "@/lib/format/date";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 9 §11 — every event here is already client-safe by the
// time it reaches this component (no internal notes/employee comments —
// see the type's own comment in shared/types/project.ts).
export default function ProjectTimelineView({ events }: { events: ProjectTimelineEvent[] }) {
  if (events.length === 0) {
    return <EmptyState message="No timeline events yet." />;
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-0.5 border-l-2 border-carbon pl-3">
          <span className="font-body text-xs text-ash">{formatDateTime(event.date)}</span>
          <span className="font-body text-sm text-bone">{event.title}</span>
          {event.description && <span className="font-body text-xs text-ash">{event.description}</span>}
        </li>
      ))}
    </ol>
  );
}
