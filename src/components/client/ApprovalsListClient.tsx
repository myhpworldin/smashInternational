"use client";

import { useState } from "react";
import type { ApprovalItem, ApprovalStatus } from "@/shared/types/approval";
import ApprovalCard from "@/components/client/ApprovalCard";
import EmptyState from "@/components/client/EmptyState";

const FILTERS: { value: "" | ApprovalStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "awaiting_client", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "completed", label: "Completed" },
];

// Stage 1 Phase 12 §29 — the empty state is deliberately calm ("You're
// all caught up"), never an alarming warning, for the normal case of
// having nothing pending.
export default function ApprovalsListClient({ approvals }: { approvals: ApprovalItem[] }) {
  const [filter, setFilter] = useState<"" | ApprovalStatus>("");

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 border border-carbon px-4 py-6">
        <p className="font-body text-sm text-bone">You&apos;re all caught up.</p>
        <p className="font-body text-sm text-ash">There are no pending approvals.</p>
      </div>
    );
  }

  const filtered = filter ? approvals.filter((a) => a.status === filter) : approvals;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`rounded-none border px-3 py-2 font-body text-xs focus-visible:-outline-offset-2 ${
              filter === f.value ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-void text-ash"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No approvals match this filter." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <ApprovalCard approval={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
