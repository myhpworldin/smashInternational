import type { OnboardingStatus } from "@/shared/types/onboarding";
import { isServicesStepComplete, type OnboardingDraftShape } from "@/shared/onboarding/completeness";

// The state model this phase asks for — deliberately only these four
// progress states, mapped from the *real* status/draft data the onboarding
// backend already tracks (see src/server/repositories/onboarding.repo.ts),
// not a separate mock of its own. Only the "authenticated" half of the
// picture is mocked (see lib/mock/clientSession.ts); onboarding progress
// is real and already persists correctly across a refresh on its own.
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

// Section 6's redirect logic, expressed as one small pure function rather
// than scattered across every call site — a real backend swap only ever
// needs to change what feeds into this, never this function itself.
//
// "submitted" and "not_started"/"incomplete" all currently resolve to the
// same /onboarding URL: that page already branches internally between the
// wizard and the "Under Review" status screen based on the real status
// (a decision made explicitly in Stage 1 Phase 4, not an oversight here) —
// there is no separate /onboarding/status route to send them to instead.
export function resolveClientDestination(
  auth: ClientAuthStatus,
  progress: OnboardingProgressState | null,
): string {
  if (auth === "unauthenticated") return "/login";
  if (progress === "approved") return "/dashboard";
  return "/onboarding";
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
