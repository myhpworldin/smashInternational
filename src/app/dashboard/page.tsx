import ProtectedClientRoute from "@/components/auth/ProtectedClientRoute";
import { site } from "@/shared/config/site";

// A stub — the real client dashboard is future work (see Stage 1 Phase 5's
// state model). This exists to demonstrate the route guard on a page that
// has no existing users or behavior to break, unlike /onboarding.
export default function ClientDashboardPage() {
  return (
    <ProtectedClientRoute requireApprovedOnboarding>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 py-4 text-center">
        <h1 className="font-display text-2xl text-bone">Welcome to {site.shortName}</h1>
        <p className="font-body text-sm text-ash">Your onboarding has been approved.</p>
      </main>
    </ProtectedClientRoute>
  );
}
