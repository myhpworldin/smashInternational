"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminReviewActions({ onboardingId }: { onboardingId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = async (decision: "approved" | "changes_requested") => {
    if (submitting) return;

    if (decision === "changes_requested" && notes.trim().length === 0) {
      setError("Enter a reason before requesting changes.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/onboarding/${onboardingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? data?.message ?? "Couldn't save this decision. Try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-carbon pt-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      {showChangesForm && (
        <div className="flex flex-col gap-2">
          <label htmlFor="review-notes" className="font-body text-sm text-bone">
            Reason for requesting changes
          </label>
          <textarea
            id="review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-none border border-carbon bg-carbon px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
            placeholder="Be specific about what needs to change."
          />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => submitDecision("approved")}
          disabled={submitting}
          aria-busy={submitting}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Approve
        </button>
        {showChangesForm ? (
          <button
            type="button"
            onClick={() => submitDecision("changes_requested")}
            disabled={submitting}
            aria-busy={submitting}
            className="rounded-none border border-smash bg-smash-dim px-[18px] py-[14px] font-body text-bone disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {submitting ? "Saving" : "Send request for changes"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowChangesForm(true)}
            className="rounded-none border border-carbon bg-carbon px-[18px] py-[14px] font-body text-bone hover:border-ash focus-visible:-outline-offset-2"
          >
            Request Changes
          </button>
        )}
      </div>
    </div>
  );
}
