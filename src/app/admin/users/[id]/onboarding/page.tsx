import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole, getCurrentUser } from "@/server/auth/dal";
import { resolveOnboardingForAdmin } from "@/server/services/onboarding.service";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import type { OnboardingDraft } from "@/store/useOnboardingDraftStore";
import { generateNavigationKey } from "@/lib/onboarding/navigationKey";

// Stage 1 Phase 29 — admin-assisted onboarding entry point, reached from
// "Fill Onboarding"/"Continue Onboarding" on the User Management row for a
// client (UserActionsMenu.tsx/UserManagementView.tsx). Deliberately reuses
// the exact same OnboardingWizard the client's own /onboarding route
// renders — see OnboardingApiContext for how the same component tree
// serves both without a second implementation. A locked-status record
// (submitted/under_review/approved) has nothing left for this page to do:
// it redirects to the existing admin onboarding review page
// (/admin/onboarding/[id]) rather than rendering a second "already
// submitted" view.
export const dynamic = "force-dynamic";

const LOCKED_STATUSES = new Set(["submitted", "under_review", "approved"]);

export default async function AdminFillOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const admin = await getCurrentUser();
  if (!admin) {
    redirect("/login");
  }

  const result = await resolveOnboardingForAdmin(id, admin);
  if (!result.ok) {
    return (
      <main className="px-6 py-10 md:px-10">
        <p className="font-body text-sm text-smash-text">{result.errors.join(" ")}</p>
        <Link href="/admin/users" className="mt-2 inline-block font-body text-sm text-ash underline">
          Back to User Management
        </Link>
      </main>
    );
  }

  const doc = result.data;

  // Nothing left for this page to do once a submission exists — the
  // existing admin review page is the single source of truth for viewing/
  // acting on it (Phase 29 §27: never a second "already submitted" view,
  // and never a duplicate onboarding record created by clicking "Fill
  // Onboarding" again on an already-progressed client).
  if (LOCKED_STATUSES.has(doc.status)) {
    redirect(`/admin/onboarding/${doc._id.toHexString()}`);
  }

  const company = doc.company as { name?: string } | null;

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
    <div className="flex flex-col gap-4 px-6 py-6 md:px-10">
      {/* Phase 29 §13 — an unobtrusive but unmistakable context banner, so
          the admin can never mistake this for their own onboarding. */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 border border-smash-dim bg-smash-dim/10 px-4 py-3">
        <div>
          <p className="font-body text-xs tracking-[0.14em] text-smash-text uppercase">Admin-Assisted Onboarding</p>
          <p className="font-body text-sm text-bone">
            Client: {company?.name ?? "Not yet named"}
          </p>
        </div>
        <Link
          href="/admin/users"
          className="shrink-0 font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
        >
          Back to User Management
        </Link>
      </div>

      <OnboardingWizard
        key={generateNavigationKey()}
        initialDraft={initialDraft}
        changesRequestedNotes={doc.status === "changes_requested" ? doc.review.notes : null}
        onboardingId={doc._id.toHexString()}
        serverUpdatedAt={doc.updatedAt.toISOString()}
        apiBase={`/api/admin/users/${id}/onboarding`}
        onSubmitRedirectPath={`/admin/onboarding/${doc._id.toHexString()}`}
      />
    </div>
  );
}
