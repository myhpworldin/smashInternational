import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { getPerformanceTrend } from "@/server/services/analytics.service";
import { parsePeriodQuery } from "@/server/analytics/parsePeriod";

export const runtime = "nodejs";

// Stage 1 Phase 20 §14/§31/§33 — same session-derived clientId rule as
// /api/client/performance/summary.
export async function GET(request: Request) {
  const user = await getAuthorizedClient();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!user.clientId) {
    return NextResponse.json({ ok: true, data: { points: [] } }, { status: 200 });
  }

  const parsed = parsePeriodQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  try {
    const trend = await getPerformanceTrend(user.clientId, parsed.periodKey, parsed.custom);
    return NextResponse.json({ ok: true, data: trend }, { status: 200 });
  } catch (error) {
    console.error("[client/performance/trend/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
