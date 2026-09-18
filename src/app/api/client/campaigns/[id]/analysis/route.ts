import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { getCampaignAnalysisForClient } from "@/server/services/analytics.service";
import { parsePeriodQuery } from "@/server/analytics/parsePeriod";

export const runtime = "nodejs";

// Stage 1 Phase 20 §11/§31/§33 — the campaign id comes from the URL (an
// attacker-controllable value), so ownership is enforced inside
// getCampaignAnalysisForClient (assertClientOwnership) rather than
// trusted — a campaign that exists but belongs to another client returns
// the same 404 as one that doesn't exist at all, never leaking which.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const parsed = parsePeriodQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  try {
    const analysis = await getCampaignAnalysisForClient(id, user.clientId, parsed.periodKey, parsed.custom);
    if (!analysis) {
      return NextResponse.json({ ok: false, message: "Campaign not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: analysis }, { status: 200 });
  } catch (error) {
    console.error("[client/campaigns/analysis/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
