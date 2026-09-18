"use client";

// Stage 1 Phase 11 §29 — real browser printing, nothing server-side. No
// PDF is generated or faked; this is the only download/print affordance
// this phase implements, exactly as scoped ("prepare... browser
// printing... do not implement server-side PDF generation").
export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2 print:hidden"
    >
      Print Report
    </button>
  );
}
