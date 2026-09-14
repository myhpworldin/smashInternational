import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import OnboardingStatusScreen from "@/components/onboarding/OnboardingStatusScreen";
import ProtectedClientRoute from "@/components/auth/ProtectedClientRoute";
import StepTransition from "@/components/onboarding/StepTransition";
import type { OnboardingDraft } from "@/store/useOnboardingDraftStore";
import type { CompanyInput } from "@/shared/validation/onboarding";
import { blockIfPasswordChangeRequired } from "@/server/auth/dal";

// As of Stage 1 Phase 6, this page requires the mock client auth state
// (see ProtectedClientRoute) — that's a routing-layer gate only, added
// around this page's output, not inside it. As of Stage 2 Phase 4,
// resolveOnboardingIdentity is what actually identifies which draft
// belongs to this visitor: a logged-in client's real session (claiming/
// linking a draft the first time it's used), an anonymous visitor's
// onboarding_access cookie otherwise. A real admin session is redirected
// away from this route entirely in src/proxy.ts, before this component
// ever runs, rather than being handled here.
export const dynamic = "force-dynamic";

const LOCKED_STATUSES = new Set(["submitted", "under_review", "approved"]);

export default async function OnboardingPage() {
  // Real-session check, ahead of resolveOnboardingIdentity — a no-op for
  // an anonymous visitor (no real session at all); only redirects a
  // logged-in account that still owes a mandatory password change
  // (Phase 5 spec, §4/§5).
  await blockIfPasswordChangeRequired();

  const { doc } = await resolveOnboardingIdentity();

  if (LOCKED_STATUSES.has(doc.status)) {
    const company = doc.company as Partial<CompanyInput> | null;
    return (
      <ProtectedClientRoute>
        {/* The wizard's own steps all fade in via this same component
            (see OnboardingWizard) — reused here, not a new animation,
            so the submit → status handoff doesn't read as an abrupt cut
            after every step before it was a smooth beat. */}
        <StepTransition>
          <OnboardingStatusScreen
            status={doc.status}
            submittedAt={doc.submittedAt ? doc.submittedAt.toISOString() : null}
            selectedServiceIds={doc.selectedServiceIds}
            companyName={company?.name ?? null}
            reviewNotes={doc.review.notes}
          />
        </StepTransition>
      </ProtectedClientRoute>
    );
  }

  const initialDraft: OnboardingDraft = {
    selectedServiceIds: doc.selectedServiceIds,
    serviceResponses: doc.serviceResponses,
    brandProfile: doc.brandProfile,
    company: doc.company,
    objectives: doc.objectives,
    targetAudience: doc.targetAudience,
    budget: doc.budget,
  };

  return (
    <ProtectedClientRoute>
      <OnboardingWizard
        initialDraft={initialDraft}
        changesRequestedNotes={doc.status === "changes_requested" ? doc.review.notes : null}
      />
    </ProtectedClientRoute>
  );
}
