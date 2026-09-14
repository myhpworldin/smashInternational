import { NextRequest, NextResponse } from "next/server";
import { changePasswordSchema } from "@/shared/validation/auth";
import { changePassword } from "@/server/services/auth.service";
import { verifySession } from "@/server/auth/dal";

export const runtime = "nodejs";

// Deliberately reachable regardless of mustChangePassword — this is the
// one action a forced-password-change session is allowed to take (Phase 5
// spec, §5). verifySession only requires a valid, non-blocked session (it
// doesn't look at mustChangePassword at all); every other admin/client
// mutation route requires more than that (see getAuthorizedAdmin in
// dal.ts for the admin side). A plain 401 here, not a redirect — this is
// a JSON endpoint, not a page, and a fetch() caller can't do anything
// useful with a redirect to an HTML login page.
export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ ok: false, errors: ["Your session has expired. Log in again."] }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.some((issue) => issue.message === "Passwords do not match")
      ? "Passwords do not match."
      : "Choose a password that's at least 8 characters.";
    return NextResponse.json({ ok: false, errors: [message] }, { status: 400 });
  }

  const result = await changePassword(session.userId, parsed.data.newPassword);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true, role: result.role }, { status: 200 });
}
