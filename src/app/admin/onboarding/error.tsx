"use client";

// Error boundaries must be Client Components — this is Next.js's own
// requirement, not a stylistic choice.
export default function OnboardingListError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="px-6 py-10 md:px-10">
      <p className="font-body text-sm text-smash-text">
        Couldn&apos;t load onboarding submissions. Try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-none border border-carbon bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-ash focus-visible:-outline-offset-2"
      >
        Retry
      </button>
    </main>
  );
}
