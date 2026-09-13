import { NextResponse } from "next/server";
import { resolveOnboardingIdentity, submitDraft } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { doc, viaSession } = await resolveOnboardingIdentity();

    // Filling out the form stays login-free (the public, shareable-link
    // draft flow) — final submission is the one point that requires a
    // real account, per Stage 2 Phase 6. The wizard's own submit handler
    // already special-cases a 401 here by redirecting to /login, so this
    // needed no frontend change.
    if (!viaSession) {
      return NextResponse.json(
        { ok: false, message: "Please create an account or log in before submitting." },
        { status: 401 },
      );
    }

    const result = await submitDraft(doc._id, doc.clientId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, status: "submitted", submittedAt: result.data.submittedAt },
      { status: 200 },
    );
  } catch (error) {
    console.error("[onboarding/submit] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
