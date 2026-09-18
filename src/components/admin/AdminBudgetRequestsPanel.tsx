"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetChangeRequest } from "@/shared/types/budget";
import { BUDGET_REQUEST_STATUS_LABEL } from "@/shared/types/budget";
import { formatINR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 18 §22-25 — the admin side of the budget-request
// workflow: approveBudgetChangeRequest/rejectBudgetChangeRequest already
// enforce "not already processed" and (for approval) the staleness check
// server-side; this panel just surfaces the buttons and their result.
export default function AdminBudgetRequestsPanel({ requests }: { requests: BudgetChangeRequest[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) {
    return <p className="font-body text-sm text-ash">No budget requests from this client yet.</p>;
  }

  const handleReview = async (id: string, action: "approve" | "reject") => {
    if (pendingId) return;
    setPendingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/budget-requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? data?.message ?? `Couldn't ${action} this request.`);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 border border-white/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-body text-sm text-bone">
                {r.channelName ?? "Total budget"}
                {r.campaignName ? ` · ${r.campaignName}` : ""}
              </span>
              <span className="font-body text-xs text-ash">{BUDGET_REQUEST_STATUS_LABEL[r.status]}</span>
            </div>
            <span className="font-body text-xs text-ash">
              {formatINR(r.currentAllocation)} → {formatINR(r.requestedAllocation)} · requested{" "}
              {formatDateTime(r.requestedAt)}
            </span>
            <p className="font-body text-sm text-bone">{r.reason}</p>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReview(r.id, "approve")}
                  disabled={pendingId === r.id}
                  className="rounded-none bg-white px-3 py-2 font-body text-xs text-void disabled:opacity-60 focus-visible:-outline-offset-2"
                >
                  {pendingId === r.id ? "Saving" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(r.id, "reject")}
                  disabled={pendingId === r.id}
                  className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
