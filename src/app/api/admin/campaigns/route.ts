import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createCampaignSchema } from "@/shared/validation/campaigns";
import { createCampaignForAdmin } from "@/server/services/campaigns.service";

export const runtime = "nodejs";

// Stage 1 Phase 18 — the write path AdminCampaignsPanel (Phase 13) calls
// via lib/admin-actions/operations.ts's saveCampaign. Same relationship
// validation pattern as /api/admin/projects: createCampaignForAdmin
// re-checks server-side that the given service engagement really belongs
// to the given client.
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid campaign payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId) || !ObjectId.isValid(parsed.data.serviceEngagementId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await createCampaignForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        serviceEngagementId: new ObjectId(parsed.data.serviceEngagementId),
        name: parsed.data.name,
        platform: parsed.data.platform,
        objective: parsed.data.objective,
        status: parsed.data.status,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        budget: parsed.data.budget,
        spend: parsed.data.spend,
      },
      admin._id,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, campaign: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/campaigns] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
