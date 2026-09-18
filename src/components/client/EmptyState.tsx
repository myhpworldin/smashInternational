// Stage 1 Phase 5 §27 — one honest "nothing here yet" component reused by
// every future-data page (Projects, Campaigns, Performance, Reports,
// Approvals, Documents, Notifications, Messages, Support…) instead of a
// blank screen or fabricated placeholder numbers. `action` is optional —
// most empty states here are pure "not built yet," not "go do something."
export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-carbon px-4 py-6">
      <p className="font-body text-sm text-ash">{message}</p>
      {action}
    </div>
  );
}
