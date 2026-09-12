import { NextRequest, NextResponse } from "next/server";
import { onboardingDraftSchema } from "@/shared/validation/onboarding";
import { getOrCreateAnonymousDraft, saveDraft } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

// No login — the onboarding_access cookie (set by getOrCreateAnonymousDraft)
// is the only thing identifying which draft this request belongs to.
export async function GET() {
  const doc = await getOrCreateAnonymousDraft();
  return NextResponse.json({ ok: true, onboarding: doc }, { status: 200 });
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

  const doc = await getOrCreateAnonymousDraft();
  const result = await saveDraft(doc._id, doc.clientId, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
