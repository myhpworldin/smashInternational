import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { approveForClient } from "@/server/services/approvals.service";

export const runtime = "nodejs";

// Stage 1 Phase 22 §8/§9 — the real endpoint behind ApprovalActions.tsx's
// "Approve" button (currently calling the honest lib/client-actions/
// approvals.ts stub). Wiring that stub to this route is a Phase 23
// integration task; this phase only prepares the backend contract.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await approveForClient(id, user.clientId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, approval: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/approvals/approve] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
