"use client";

import { useState } from "react";
import type { BudgetAllocationChannel } from "@/shared/types/budget";
import { submitBudgetChangeRequest } from "@/lib/client-actions/budget";
import { formatINR } from "@/lib/format/currency";

// Stage 1 Phase 12 §16/§17/§20 — a real, fully validated request form
// (never a live budget editor: the only action is "Request Change," §20).
// Submission goes through submitBudgetChangeRequest, which is honest
// about not being connected to a backend yet — the form still exercises
// real client-side validation and loading/error states.
export default function BudgetRequestForm({ channels }: { channels: BudgetAllocationChannel[] }) {
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [campaignName, setCampaignName] = useState("");
  const [requestedAllocation, setRequestedAllocation] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedChannel = channels.find((c) => c.id === channelId);
  const currentAllocation = selectedChannel?.allocated ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const requested = Number(requestedAllocation);
    if (!requestedAllocation || Number.isNaN(requested) || requested < 0) {
      setError("Enter a valid requested allocation amount.");
      return;
    }
    if (reason.trim().length === 0) {
      setError("Enter a reason for this request.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitBudgetChangeRequest({
      channelName: selectedChannel?.name,
      campaignName: campaignName.trim() || undefined,
      currentAllocation,
      requestedAllocation: requested,
      reason: reason.trim(),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return <p className="font-body text-sm text-bone">Your budget change request has been submitted.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      {channels.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="budget-channel" className="font-body text-xs text-ash uppercase">
            Service / Platform
          </label>
          <select
            id="budget-channel"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="budget-campaign" className="font-body text-xs text-ash uppercase">
          Campaign (optional)
        </label>
        <input
          id="budget-campaign"
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-body text-xs text-ash uppercase">Current Allocation</span>
        <span className="font-body text-sm text-bone">{formatINR(currentAllocation)}</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="budget-requested" className="font-body text-xs text-ash uppercase">
          Requested Allocation
        </label>
        <input
          id="budget-requested"
          type="number"
          min={0}
          step="1"
          value={requestedAllocation}
          onChange={(e) => setRequestedAllocation(e.target.value)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="budget-reason" className="font-body text-xs text-ash uppercase">
          Reason
        </label>
        <textarea
          id="budget-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Increase lead generation"
          className="resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="self-start rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
      >
        {submitting ? "Submitting" : "Submit Request"}
      </button>
    </form>
  );
}
