"use client";

// Stage 1 Phase 11 §17 — no backend review persistence exists yet, so
// this is deliberately disabled rather than a working local-only toggle
// that could be mistaken for a saved state (§17: "do not falsely claim
// that review has been persisted when it has only changed locally") —
// same disabled-placeholder-action pattern as the Support page's
// "Create ticket" button from Phase 5.
export default function ReportReviewControl() {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="self-start rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone opacity-60"
    >
      Mark as Reviewed
    </button>
  );
}
