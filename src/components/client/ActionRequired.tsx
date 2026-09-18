import Link from "next/link";
import type { DashboardActionItem } from "@/shared/types/dashboard";

// Stage 1 Phase 7 §14 — renders nothing at all when there's nothing to
// act on, rather than a permanent "all clear" banner or (worse) a fake
// placeholder action. Each item's `href` already points at the real page
// that resolves it (e.g. /onboarding for a changes-requested review) —
// this component has no action-specific logic of its own, so a later
// phase's new action type (a budget request, a document request) is just
// another item, not a change here.
export default function ActionRequired({ actions }: { actions: DashboardActionItem[] }) {
  if (actions.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {actions.map((action) => (
        <li
          key={action.id}
          className="flex flex-wrap items-center justify-between gap-3 border border-smash-text/60 bg-carbon px-4 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-sm text-bone">{action.label}</span>
            <span className="font-body text-xs text-ash">{action.description}</span>
          </div>
          <Link
            href={action.href}
            className="shrink-0 rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 focus-visible:-outline-offset-2"
          >
            Review
          </Link>
        </li>
      ))}
    </ul>
  );
}
