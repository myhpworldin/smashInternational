import { redirect } from "next/navigation";
import { resolveOnboardingIdentity, isAssistedOnboarding } from "@/server/services/onboarding.service";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import OnboardingStatusScreen from "@/components/onboarding/OnboardingStatusScreen";
import StepTransition from "@/components/onboarding/StepTransition";
import type { OnboardingDraft } from "@/store/useOnboardingDraftStore";
import type { CompanyInput } from "@/shared/validation/onboarding";
import { blockIfPasswordChangeRequired } from "@/server/auth/dal";
import { generateNavigationKey } from "@/lib/onboarding/navigationKey";

// Stage 1 Phase 6 fix: this page must stay reachable by a genuinely
// anonymous visitor — the whole point of the no-login onboarding flow
// (resolveOnboardingIdentity below already handles that case on its own,
// via the onboarding_access cookie). An earlier phase wrapped this page's
// output in ProtectedClientRoute, whose guard redirects anyone without a
// (mock, client-side-only) session straight to /login — verified live
// that this broke onboarding entirely for a first-time visitor with no
// account yet. Removed; resolveOnboardingIdentity + blockIfPasswordChangeRequired
// below are the real, server-side identity/gating logic this page needs,
// and were already sufficient on their own — ProtectedClientRoute here
// added a bug, not security (a client-side check is never a real
// boundary — see that component's own comment).
export const dynamic = "force-dynamic";

const LOCKED_STATUSES = new Set(["submitted", "under_review", "approved"]);

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Real-session check, ahead of resolveOnboardingIdentity — a no-op for
  // an anonymous visitor (no real session at all); only redirects a
  // logged-in account that still owes a mandatory password change
  // (Phase 5 spec, §4/§5).
  await blockIfPasswordChangeRequired();

  // A client whose account was created by an admin has their onboarding
  // filled in on their behalf by the SMASH team — they have no wizard work
  // of their own to do, so this route (however reached, including a direct
  // visit) always sends them to the client panel instead. A no-op for an
  // anonymous visitor (no real session at all).
  if (await isAssistedOnboarding()) {
    redirect("/dashboard");
  }

  const { doc } = await resolveOnboardingIdentity();
  const params = await searchParams;

  if (LOCKED_STATUSES.has(doc.status)) {
    // Stage 1 Phase 2: the ?submitted=1 marker set by OnboardingWizard's
    // own post-submit navigation is the only signal that this render is
    // the instant right after a real submission — status alone can't tell
    // that apart from a client returning to this same URL a week later,
    // and only the former should run the countdown into the dashboard.
    const justSubmitted = doc.status === "submitted" && params.submitted === "1";

    // Anything else reaching a locked status here — a bookmark, a typed
    // URL, a stale tab reopened days later — is a client who has already
    // finished the wizard and belongs on /dashboard (the same destination
    // resolveClientDestination sends them to right after login; see
    // src/lib/routing/clientDestination.ts). Without this, this route
    // dead-ended: the status screen below renders with no countdown and
    // no link anywhere back into the portal, so a client landing here any
    // way other than the instant after submitting had no way to navigate
    // onward at all.
    if (!justSubmitted) {
      redirect("/dashboard");
    }

    const company = doc.company as Partial<CompanyInput> | null;
    return (
      // The wizard's own steps all fade in via this same component (see
      // OnboardingWizard) — reused here, not a new animation, so the
      // submit → status handoff doesn't read as an abrupt cut after every
      // step before it was a smooth beat.
      <StepTransition>
        <OnboardingStatusScreen
          status={doc.status}
          submittedAt={doc.submittedAt ? doc.submittedAt.toISOString() : null}
          selectedServiceIds={doc.selectedServiceIds}
          companyName={company?.name ?? null}
          reviewNotes={doc.review.notes}
          justSubmitted={justSubmitted}
        />
      </StepTransition>
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
    // Keyed per server render (this component body only re-executes on a
    // real navigation/reload — force-dynamic, never on in-page
    // interaction) so a browser Back/Forward that revisits /onboarding
    // always mounts a fresh OnboardingWizard instance. Without this, React
    // can reconcile the existing client instance across such a navigation
    // and just hand it new props — but OnboardingWizard seeds its
    // draft/step state from those props with useState, which only reads
    // its argument on first mount, so a reused instance would keep
    // showing whatever (possibly empty) data it had before, even though
    // the fresh props right there are correct.
    <OnboardingWizard
      key={generateNavigationKey()}
      initialDraft={initialDraft}
      changesRequestedNotes={doc.status === "changes_requested" ? doc.review.notes : null}
      onboardingId={doc._id.toHexString()}
      serverUpdatedAt={doc.updatedAt.toISOString()}
    />
  );
}
