import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { updateServiceEngagementStatusSchema } from "@/shared/validation/serviceEngagements";
import { updateEngagementStatus } from "@/server/services/serviceEngagements.service";
import type { ServiceEngagementStatus } from "@/shared/types/serviceEngagement";

export const runtime = "nodejs";

// Stage 1 Phase 4 — the one write path for moving a service engagement
// through its lifecycle (§20). Admin-only: a client hitting this route
// (even for their own engagement) gets 401, since nothing about "my
// service should be marked active" is ever the client's call to make —
// only SMASH staff drive this transition. All transition-graph validation
// and idempotent no-op handling lives in updateEngagementStatus itself.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateServiceEngagementStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid status payload." }, { status: 400 });
  }

  try {
    const result = await updateEngagementStatus(
      new ObjectId(id),
      admin,
      parsed.data.status as ServiceEngagementStatus,
      parsed.data.reason ?? null,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ ok: true, engagement: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/service-engagements/status] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
