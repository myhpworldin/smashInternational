"use client";

import { useState } from "react";
// Reused as-is (Phase 12 §26/§27) — the same generic confirm/edit dialog
// admin/users uses; nothing about it is admin-specific.
import Modal from "@/components/admin/users/Modal";
import { approveDeliverable, requestApprovalChanges } from "@/lib/client-actions/approvals";

type ActionState = "idle" | "approved" | "changes_requested";

// Stage 1 Phase 12 §26-28 — both actions go through the abstracted
// approvals action module, which is honest about not being connected to
// a backend yet; the UI still exercises the full confirm → loading →
// success/error flow, and the submit buttons disable themselves the
// instant a request starts to prevent duplicate clicks.
export default function ApprovalActions({ approvalId }: { approvalId: string }) {
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>("idle");

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await approveDeliverable(approvalId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setState("approved");
    setConfirmingApprove(false);
  };

  const handleRequestChanges = async () => {
    if (submitting) return;
    if (message.trim().length === 0) {
      setError("Enter what needs to change.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await requestApprovalChanges(approvalId, message.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setState("changes_requested");
    setRequestingChanges(false);
  };

  if (state === "approved") {
    return <p className="font-body text-sm text-bone">Approval submitted.</p>;
  }
  if (state === "changes_requested") {
    return <p className="font-body text-sm text-bone">Changes requested.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConfirmingApprove(true)}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setRequestingChanges(true)}
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          Request Changes
        </button>
      </div>

      <Modal open={confirmingApprove} onClose={() => setConfirmingApprove(false)} title="Approve this deliverable?">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-ash">
            This confirms you&apos;re happy with this deliverable as submitted.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
            >
              {submitting ? "Submitting" : "Yes, Approve"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingApprove(false)}
              className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={requestingChanges} onClose={() => setRequestingChanges(false)} title="Request Changes">
        <div className="flex flex-col gap-4">
          <label htmlFor="change-message" className="font-body text-xs text-ash uppercase">
            What needs to change?
          </label>
          <textarea
            id="change-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Please change the headline and use the updated product image."
            className="resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRequestChanges}
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-none border border-smash bg-smash-dim px-[18px] py-[14px] font-body text-sm text-bone disabled:opacity-60 focus-visible:-outline-offset-2"
            >
              {submitting ? "Submitting" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setRequestingChanges(false)}
              className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
