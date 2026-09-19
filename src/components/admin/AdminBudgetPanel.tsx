"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetSnapshot } from "@/shared/types/budget";
// Reused as-is — the same generic confirm dialog already reused for the
// client-facing Approve/Request-Changes actions in Phase 12.
import Modal from "@/components/admin/users/Modal";
import { saveBudgetAllocations } from "@/lib/admin-actions/operations";
import { formatINR } from "@/lib/format/currency";

export type BudgetServiceOption = { id: string; label: string };

// Stage 1 Phase 13 §17/§21 — this is the ACTUAL allocated/spent/remaining
// figure the client's Budget page reads (shared/types/budget.ts), never
// the onboarding-planned figure — editing it goes through a confirmation
// step ("this will update what the client sees") since it's exactly the
// kind of client-visible correction §21 calls out by name.
//
// Extended to allocate per service (not free-text "channels"): `services`
// is the client's own live service engagements (engagedServiceOptions on
// the onboarding detail page), so every allocation row is tied to a real
// service the client actually has — never an arbitrary label. Saving
// always sends the total plus the complete set of per-service amounts in
// one call; the server rejects (and this form blocks before submitting)
// any allocation total that exceeds the overall budget.
export default function AdminBudgetPanel({
  clientId,
  snapshot,
  services,
}: {
  clientId: string;
  snapshot: BudgetSnapshot | null;
  services: BudgetServiceOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [total, setTotal] = useState(String(snapshot?.total ?? ""));
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const service of services) {
      const existing = snapshot?.allocations.find((a) => a.name === service.label);
      map[service.id] = existing ? String(existing.allocated) : "";
    }
    return map;
  });
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalValue = Number(total) || 0;
  const allocatedValue = services.reduce((sum, service) => sum + (Number(amounts[service.id]) || 0), 0);
  const overAllocated = allocatedValue > totalValue;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await saveBudgetAllocations({
      clientId,
      total: totalValue,
      allocations: services.map((service) => ({
        id: service.id,
        name: service.label,
        allocated: Number(amounts[service.id]) || 0,
      })),
    });
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
    if (!total || Number.isNaN(totalValue) || totalValue < 0) {
      setError("Enter a valid, non-negative total budget.");
      return;
    }
    if (overAllocated) {
      setError("Allocated amounts can't exceed the total budget.");
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

      {!editing && snapshot && snapshot.allocations.length > 0 && (
        <ul className="flex flex-col gap-1">
          {snapshot.allocations.map((allocation) => (
            <li
              key={allocation.id}
              className="flex items-center justify-between border border-carbon px-3 py-1.5 font-body text-xs"
            >
              <span className="text-bone">{allocation.name}</span>
              <span className="text-ash">{formatINR(allocation.allocated)}</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      {editing ? (
        <div className="flex flex-col gap-4 border border-carbon p-4">
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

          {services.length === 0 ? (
            <p className="font-body text-xs text-ash">
              This client has no active services yet — set a total budget for now; per-service allocation becomes
              available once services are engaged.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-body text-xs text-ash uppercase">Allocate by service</span>
              {services.map((service) => (
                <label key={service.id} className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-bone">{service.label}</span>
                  <input
                    type="number"
                    min={0}
                    value={amounts[service.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [service.id]: e.target.value }))}
                    className="w-32 rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
                  />
                </label>
              ))}
              <p className={`font-body text-xs ${overAllocated ? "text-smash-text" : "text-ash"}`}>
                Allocated {formatINR(allocatedValue)} of {formatINR(totalValue)}
                {overAllocated ? " — over budget" : ""}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
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
