import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { createBudgetChangeRequestSchema } from "@/shared/validation/budget";
import { submitBudgetChangeRequestForClient } from "@/server/services/budget.service";

export const runtime = "nodejs";

// Stage 1 Phase 18 §20/§26 — the write path BudgetRequestForm (Phase 12)
// calls via lib/client-actions/budget.ts's submitBudgetChangeRequest.
// clientId always comes from the session (getAuthorizedClient), never the
// request body — a client can only ever submit a request against their
// own budget.
export async function POST(request: Request) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBudgetChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
  }

  try {
    const result = await submitBudgetChangeRequestForClient(
      user.clientId,
      {
        channelName: parsed.data.channelName,
        campaignName: parsed.data.campaignName,
        requestedAllocation: parsed.data.requestedAllocation,
        reason: parsed.data.reason,
      },
      user._id,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, request: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/budget-requests] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
