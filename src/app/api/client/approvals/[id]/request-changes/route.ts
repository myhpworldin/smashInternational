import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { requestApprovalChangesSchema } from "@/shared/validation/approvals";
import { requestChangesForClient } from "@/server/services/approvals.service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestApprovalChangesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "A change request comment is required." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await requestChangesForClient(id, user.clientId, parsed.data.comment);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, approval: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/approvals/request-changes] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
