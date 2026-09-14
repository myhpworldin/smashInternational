import { redirect } from "next/navigation";
import { requireAuthenticatedSession, getCurrentUser } from "@/server/auth/dal";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

// Where requireRole (dal.ts) and blockIfPasswordChangeRequired send any
// session whose account still owes a mandatory password change — the one
// destination that stays reachable regardless of role or
// mustChangePassword, so this is deliberately the only page in the app
// that doesn't gate on either. Also the landing spot for a direct URL
// visit or a refresh mid-flow (Phase 5 spec, §9): both just re-run this
// same server-side check, so there's no client-only state to lose.
export const dynamic = "force-dynamic";

export default async function ForcePasswordChangePage() {
  await requireAuthenticatedSession();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    // Already done (e.g. a stale tab reopened after completing this
    // elsewhere) — send them on rather than showing this page again.
    redirect(user.role === "admin" ? "/admin" : "/onboarding");
  }

  return <ChangePasswordModal />;
}
