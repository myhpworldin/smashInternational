import { NextRequest, NextResponse } from "next/server";
import { onboardingDraftSchema } from "@/shared/validation/onboarding";
import { resolveOnboardingIdentity, saveDraft } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

const GENERIC_ERROR = { ok: false, message: "Something went wrong. Try again shortly." };

// Identity (which draft this request belongs to) is always resolved
// server-side — a logged-in client via their session, an anonymous
// visitor via the onboarding_access cookie. Never anything the request
// body could supply. See resolveOnboardingIdentity for the full story.
export async function GET() {
  try {
    const { doc } = await resolveOnboardingIdentity();
    return NextResponse.json({ ok: true, onboarding: doc }, { status: 200 });
  } catch (error) {
    console.error("[onboarding/GET] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = onboardingDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid onboarding data.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { doc } = await resolveOnboardingIdentity();
    const result = await saveDraft(doc._id, doc.clientId, parsed.data);

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[onboarding/PUT] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
