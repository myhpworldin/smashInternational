import { getOrCreateAnonymousDraft } from "@/server/services/onboarding.service";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import OnboardingStatusScreen from "@/components/onboarding/OnboardingStatusScreen";
import type { OnboardingDraft } from "@/store/useOnboardingDraftStore";
import type { CompanyInput } from "@/shared/validation/onboarding";

// Public — no login. This single URL is meant to be shared directly with a
// client; a visitor's onboarding_access cookie (set on first visit, see
// getOrCreateAnonymousDraft) is what ties their browser back to their own
// draft on later visits, including after they've submitted. There's no
// separate "reopen with an account" path — see access.ts for that
// trade-off.
export const dynamic = "force-dynamic";

const LOCKED_STATUSES = new Set(["submitted", "under_review", "approved"]);

export default async function OnboardingPage() {
  const doc = await getOrCreateAnonymousDraft();

  if (LOCKED_STATUSES.has(doc.status)) {
    const company = doc.company as Partial<CompanyInput> | null;
    return (
      <OnboardingStatusScreen
        status={doc.status}
        submittedAt={doc.submittedAt ? doc.submittedAt.toISOString() : null}
        selectedServiceIds={doc.selectedServiceIds}
        companyName={company?.name ?? null}
        reviewNotes={doc.review.notes}
      />
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
    <OnboardingWizard
      initialDraft={initialDraft}
      changesRequestedNotes={doc.status === "changes_requested" ? doc.review.notes : null}
    />
  );
}
