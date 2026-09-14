import ProtectedClientRoute from "@/components/auth/ProtectedClientRoute";
import { site } from "@/shared/config/site";
import { blockIfPasswordChangeRequired } from "@/server/auth/dal";

// A stub — the real client dashboard is future work (see Stage 1 Phase 5's
// state model). This exists to demonstrate the route guard on a page that
// has no existing users or behavior to break, unlike /onboarding.
export default async function ClientDashboardPage() {
  // Server-side, checked against the real session — ProtectedClientRoute
  // below is only the client-side mock-session UX guard (Phase 5 spec,
  // §5 wants this enforced as a backend rule, not just a frontend one).
  await blockIfPasswordChangeRequired();

  return (
    <ProtectedClientRoute requireApprovedOnboarding>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 py-4 text-center">
        <h1 className="font-display text-2xl text-bone">Welcome to {site.shortName}</h1>
        <p className="font-body text-sm text-ash">Your onboarding has been approved.</p>
      </main>
    </ProtectedClientRoute>
  );
}
