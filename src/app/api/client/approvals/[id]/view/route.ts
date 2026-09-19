import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { markApprovalViewedForClient } from "@/server/services/approvals.service";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await markApprovalViewedForClient(id, user.clientId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, approval: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/approvals/view] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
