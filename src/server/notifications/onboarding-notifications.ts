import "server-only";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";

// No notification system exists in this project yet (confirmed in the
// Phase 1 audit — the only related piece is the unrelated /api/notify
// waitlist capture on the marketing page). This is the single call site
// for "an onboarding was submitted" — swap the body for a real email/
// webhook/queue call later without touching any caller.
export async function notifyOnboardingSubmitted(doc: OnboardingDoc): Promise<void> {
  console.log(
    `[onboarding] submitted — clientId=${doc.clientId.toHexString()} onboardingId=${doc._id.toHexString()}`,
  );
}
