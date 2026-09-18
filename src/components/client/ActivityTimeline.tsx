import Link from "next/link";
import type { DashboardActivityItem } from "@/shared/types/dashboard";
import { formatDateTime } from "@/lib/format/date";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 7 §20 (link support added Phase 15) — items are already
// client-safe phrases by the time they reach here (see
// clientEvents.service.ts's describe*Transition functions); this
// component never sees an actor id, an internal reason, or anything else
// that shouldn't be shown to the client.
export default function ActivityTimeline({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState message="No recent activity." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const row = (
          <>
            <span className="font-body text-sm text-bone">{item.label}</span>
            <span className="shrink-0 font-body text-xs text-ash">{formatDateTime(item.occurredAt)}</span>
          </>
        );
        return (
          <li key={item.id} className="border-b border-carbon pb-2">
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-baseline justify-between gap-3 hover:text-ash focus-visible:-outline-offset-2"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-baseline justify-between gap-3">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
