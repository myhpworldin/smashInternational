"use client";

import { useState } from "react";
import Modal from "@/components/admin/users/Modal";

const REASON_PRESETS = [
  "Staff left company",
  "Staff unavailable",
  "Internal reassignment",
  "Role change",
  "Workload balancing",
  "Other",
] as const;

export type EligibleStaffOption = { id: string; name: string; email: string };

// Shared between Onboarding Detail's per-service view (one assignment at a
// time — Phase 3 §10) and the staff bulk-handover queue (many rows on one
// screen — §9): same replacement picker, same reason capture, same
// confirmation step, same API call, so the two entry points can never
// drift into different validation or copy.
export default function HandoverTransferControl({
  assignmentId,
  serviceLabel,
  clientLabel,
  currentStaffName,
  eligibleStaff,
  onTransferred,
}: {
  assignmentId: string;
  serviceLabel: string;
  clientLabel: string;
  currentStaffName: string;
  eligibleStaff: EligibleStaffOption[];
  onTransferred: (message: string) => void;
}) {
  const [staffUserId, setStaffUserId] = useState("");
  const [reasonPreset, setReasonPreset] = useState<(typeof REASON_PRESETS)[number] | "">("");
  const [reasonOther, setReasonOther] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStaff = eligibleStaff.find((s) => s.id === staffUserId);
  const reason = reasonPreset === "Other" ? reasonOther.trim() : reasonPreset;

  const handleConfirm = async () => {
    if (submitting || !selectedStaff) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-assignments/${assignmentId}/transfer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffUserId: selectedStaff.id, reason: reason || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? "Couldn't complete the handover. Try again.");
        return;
      }
      setConfirmOpen(false);
      // Concise, non-technical confirmation (Phase 5 §22) — handed to the
      // parent because this row is about to disappear from the list the
      // moment it refetches, so the message has to outlive the row itself.
      onTransferred(`${serviceLabel} for ${clientLabel} has been transferred to ${selectedStaff.name}.`);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && !confirmOpen && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={staffUserId}
          onChange={(e) => setStaffUserId(e.target.value)}
          className="w-full max-w-xs rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          <option value="">Select replacement…</option>
          {eligibleStaff.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name} ({staff.email})
            </option>
          ))}
        </select>

        <select
          value={reasonPreset}
          onChange={(e) => setReasonPreset(e.target.value as typeof reasonPreset)}
          className="w-full max-w-xs rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          <option value="">Reason (optional)…</option>
          {REASON_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!staffUserId}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Transfer
        </button>
      </div>

      {reasonPreset === "Other" && (
        <input
          type="text"
          value={reasonOther}
          onChange={(e) => setReasonOther(e.target.value)}
          placeholder="Describe the reason"
          className="w-full max-w-md rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      )}

      <Modal open={confirmOpen} onClose={() => (submitting ? undefined : setConfirmOpen(false))} title="Confirm handover">
        <p className="font-body text-sm text-bone">
          Transfer <span className="text-bone">{serviceLabel}</span> for{" "}
          <span className="text-bone">{clientLabel}</span>?
        </p>
        <p className="font-body text-sm text-ash">
          Current staff: <span className="text-bone">{currentStaffName}</span>
          <br />
          New staff: <span className="text-bone">{selectedStaff?.name}</span>
        </p>
        <p className="font-body text-xs text-ash">
          {currentStaffName} will no longer have access to this assigned service.
        </p>

        {error && (
          <p role="alert" className="font-body text-xs text-smash-text">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            aria-busy={submitting}
            className="rounded-none border border-smash bg-smash-dim px-[18px] py-[14px] font-body text-sm text-bone disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {submitting ? "Transferring" : "Confirm Handover"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
