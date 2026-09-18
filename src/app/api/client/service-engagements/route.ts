import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";

export const runtime = "nodejs";

// Stage 1 Phase 3 — the one read API this phase adds. clientId always
// comes from the authenticated session (getAuthorizedClient), never from
// a query/body parameter, so a client can never retrieve another client's
// engagements by supplying a different id (Phase 3 §19). A client whose
// account has no clientId yet (verified their email but never touched
// /onboarding) has by definition never had anything approved, so an empty
// list is the correct answer, not an error.
export async function GET() {
  const user = await getAuthorizedClient();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!user.clientId) {
    return NextResponse.json({ ok: true, engagements: [] }, { status: 200 });
  }

  try {
    const engagements = await listEngagementsForClient(user.clientId);
    return NextResponse.json({ ok: true, engagements }, { status: 200 });
  } catch (error) {
    console.error("[client/service-engagements/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
