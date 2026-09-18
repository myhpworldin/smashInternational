"use client";

// Shared content for every client-portal route's error.tsx (Next.js
// requires the boundary component itself to be a Client Component, and
// requires one file per segment that wants its own boundary — but nothing
// stops every one of those files from rendering this same component).
// Never surfaces the actual error (§28 — no stack traces/technical detail
// to the client).
export default function ClientErrorBoundary({
  reset,
  message = "Couldn't load this page. Try again.",
}: {
  error: Error;
  reset: () => void;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border border-carbon px-4 py-6">
      <p role="alert" className="font-body text-sm text-smash-text">
        {message}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
