"use client";

import ClientErrorBoundary from "@/components/client/ClientErrorBoundary";

// Error boundaries must be Client Components — this is Next.js's own
// requirement, not a stylistic choice. This also catches errors from every
// nested /dashboard/* route that doesn't define its own error.tsx (Next's
// error boundaries nest upward), so most Phase 5 pages don't need one.
export default function ClientDashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return <ClientErrorBoundary error={error} reset={reset} message="Couldn't load your dashboard. Try again." />;
}
