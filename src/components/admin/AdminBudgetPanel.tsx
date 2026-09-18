"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetSnapshot } from "@/shared/types/budget";
// Reused as-is — the same generic confirm dialog already reused for the
// client-facing Approve/Request-Changes actions in Phase 12.
import Modal from "@/components/admin/users/Modal";
import { saveBudgetSnapshot } from "@/lib/admin-actions/operations";
import { formatINR } from "@/lib/format/currency";

// Stage 1 Phase 13 §17/§21 — this is the ACTUAL allocated/spent/remaining
// figure the client's Budget page reads (shared/types/budget.ts), never
// the onboarding-planned figure — editing it goes through a confirmation
// step ("this will update what the client sees") since it's exactly the
// kind of client-visible correction §21 calls out by name.
export default function AdminBudgetPanel({ clientId, snapshot }: { clientId: string; snapshot: BudgetSnapshot | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [total, setTotal] = useState(String(snapshot?.total ?? ""));
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await saveBudgetSnapshot({ clientId, total: Number(total) });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setConfirming(false);
    setEditing(false);
    router.refresh();
  };

  const openConfirm = () => {
    const value = Number(total);
    if (!total || Number.isNaN(value) || value < 0) {
      setError("Enter a valid, non-negative total budget.");
      return;
    }
    setError(null);
    setConfirming(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {snapshot ? (
        <div className="grid grid-cols-3 gap-3 font-body text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-ash">Total</span>
            <span className="text-bone">{formatINR(snapshot.total)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-ash">Spent</span>
            <span className="text-bone">{formatINR(snapshot.spent)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-ash">Remaining</span>
            <span className="text-bone">{formatINR(snapshot.remaining)}</span>
          </div>
        </div>
      ) : (
        <p className="font-body text-sm text-ash">Budget has not been configured for this client yet.</p>
      )}

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      {editing ? (
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-ash uppercase">Total budget (₹)</span>
            <input
              type="number"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
            />
          </label>
          <button
            type="button"
            onClick={openConfirm}
            className="rounded-none bg-white px-4 py-2 font-body text-sm text-void focus-visible:-outline-offset-2"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          {snapshot ? "Update Budget" : "Configure Budget"}
        </button>
      )}

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Confirm budget update">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-ash">
            Changing this value will update the budget information shown to the client.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
            >
              {submitting ? "Saving" : "Confirm Update"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
