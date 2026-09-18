import type { OnboardingStatus } from "@/shared/types/onboarding";
import { isServicesStepComplete, type OnboardingDraftShape } from "@/shared/onboarding/completeness";

// The state model this phase asks for — deliberately only these four
// progress states, mapped from the *real* status/draft data the onboarding
// backend already tracks (see src/server/repositories/onboarding.repo.ts).
// Both auth and onboarding progress are real (session-derived) as of
// Stage 1 Phase 6 — there is no mock layer left in this file's picture.
export type OnboardingProgressState = "not_started" | "incomplete" | "submitted" | "approved";

export function resolveOnboardingProgress(
  status: OnboardingStatus,
  draft: OnboardingDraftShape,
): OnboardingProgressState {
  if (status === "approved") return "approved";
  if (status === "submitted" || status === "under_review") return "submitted";
  // "draft" or "changes_requested" — distinguish "never touched" from
  // "started but not done" using the same completeness check the wizard's
  // own progress bar uses, so this can never disagree with what the
  // wizard itself considers "started."
  return isServicesStepComplete(draft) ? "incomplete" : "not_started";
}

export type ClientAuthStatus = "unauthenticated" | "authenticated";

// Stage 1 Phase 6 fix: previously only "approved" landed on /dashboard,
// with "submitted"/"under_review" sent to /onboarding's status screen
// instead — that was correct before Phase 2/4, but /dashboard has since
// grown its own "Under Review" account-status state (and a
// changes_requested one, and a not-started one), making it the intended
// home for every authenticated client regardless of onboarding progress.
// Only a client who hasn't finished the wizard yet (never started, or
// started but didn't finish) is sent straight to /onboarding instead —
// they have real work to do there, so skipping the dashboard detour is
// the better UX, not an oversight.
export function resolveClientDestination(
  auth: ClientAuthStatus,
  progress: OnboardingProgressState | null,
): string {
  if (auth === "unauthenticated") return "/login";
  if (progress === "not_started" || progress === "incomplete") return "/onboarding";
  return "/dashboard";
}

// The "LOGIN → determine onboarding state → appropriate destination"
// lookup from a browser context (a login form's success handler) — reads
// the real onboarding record via the same endpoint the wizard itself uses.
// Falls back to /onboarding on any failure: that's always a safe landing
// spot (it does its own real, server-side check regardless of what this
// function decided).
export async function determineClientDestination(): Promise<string> {
  try {
    const response = await fetch("/api/onboarding");
    const data = await response.json();
    const progress = resolveOnboardingProgress(data.onboarding.status, data.onboarding);
    return resolveClientDestination("authenticated", progress);
  } catch {
    return "/onboarding";
  }
}
