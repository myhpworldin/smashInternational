import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { getPerformanceSummary } from "@/server/services/analytics.service";
import { parsePeriodQuery } from "@/server/analytics/parsePeriod";

export const runtime = "nodejs";

// Stage 1 Phase 20 §31/§33 — clientId always comes from the authenticated
// session (getAuthorizedClient), never from a query parameter, so no
// tampered request can retrieve another client's summary.
export async function GET(request: Request) {
  const user = await getAuthorizedClient();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!user.clientId) {
    return NextResponse.json({ ok: true, data: null, hasData: false }, { status: 200 });
  }

  const parsed = parsePeriodQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  try {
    const summary = await getPerformanceSummary(user.clientId, parsed.periodKey, parsed.custom);
    return NextResponse.json({ ok: true, data: summary, hasData: summary.hasData }, { status: 200 });
  } catch (error) {
    console.error("[client/performance/summary/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
