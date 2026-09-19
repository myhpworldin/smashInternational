import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { onboardingDraftSchema } from "@/shared/validation/onboarding";
import { resolveOnboardingForAdmin, saveDraft } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

const GENERIC_ERROR = { ok: false, message: "Something went wrong. Try again shortly." };

// Admin-assisted onboarding (Stage 1 Phase 29) — the admin-side mirror of
// /api/onboarding, operating on an explicit target client (:id, a user
// id) instead of the caller's own session. Reuses resolveOnboardingForAdmin
// (get-or-create, never a duplicate record) and the exact same saveDraft
// the client's own PUT route calls — there is exactly one draft-saving
// implementation, not two.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await resolveOnboardingForAdmin(id, admin);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 404 });
    }
    return NextResponse.json({ ok: true, onboarding: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/onboarding/GET] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = onboardingDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid onboarding data.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }

    const result = await saveDraft(identity.data._id, identity.data.clientId, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/onboarding/PUT] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
