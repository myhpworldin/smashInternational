// Stage 1 Phase 7 §24 — shaped like the real dashboard (header, 4 summary
// cards, a couple of section blocks) so the loading state doesn't cause a
// layout shift once real content replaces it. No existing skeleton
// convention exists elsewhere in this codebase (every other loading.tsx
// is plain text) to reuse instead.
export default function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 bg-carbon" />
        <div className="h-7 w-64 bg-carbon" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 border border-carbon bg-carbon/60" />
        ))}
      </div>

      <div className="h-24 border border-carbon bg-carbon/60" />
      <div className="h-32 border border-carbon bg-carbon/60" />
    </div>
  );
}
