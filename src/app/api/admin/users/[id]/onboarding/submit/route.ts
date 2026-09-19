import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { resolveOnboardingForAdmin, submitDraft } from "@/server/services/onboarding.service";
import * as usersRepo from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import * as auditLog from "@/server/repositories/auditLog.repo";

export const runtime = "nodejs";

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name ?? user.email;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;

  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }

    const result = await submitDraft(identity.data._id, identity.data.clientId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    // The one discrete, org-wide-auditable moment of this whole feature
    // (Phase 29 §24) — recorded here, not inside submitDraft itself, since
    // this admin-specific audit entry only makes sense for this call site;
    // the client's own submit route never touches adminAuditLogs at all.
    // targetUserId is the real client USER account (re-fetched by :id,
    // never the onboarding record's own synthetic clientId — those are
    // different ids, and every other audit entry's targetUserId is always
    // a real users-collection id).
    const targetUser = await usersRepo.findById(id);
    if (targetUser) {
      await auditLog.record({
        action: "onboarding_assisted_submitted",
        actorUserId: admin._id,
        actorName: displayName(admin),
        actorEmail: admin.email,
        targetUserId: targetUser._id,
        targetName: displayName(targetUser),
        targetEmail: targetUser.email,
        targetRole: "client",
        metadata: { onboardingId: identity.data._id.toHexString() },
      });
    }

    return NextResponse.json(
      { ok: true, status: "submitted", submittedAt: result.data.submittedAt },
      { status: 200 },
    );
  } catch (error) {
    console.error("[admin/users/onboarding/submit] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
