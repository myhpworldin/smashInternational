import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { getPerformanceSummary } from "@/server/services/analytics.service";
import { parsePeriodQuery } from "@/server/analytics/parsePeriod";

export const runtime = "nodejs";

// Stage 1 Phase 20 §32 — admin-only broader access: unlike the client
// route, clientId here comes from the URL and is trusted once the caller
// is a confirmed admin (same reasoning as every other admin-side lookup
// in this codebase — an admin has no tenant boundary to cross-check).
export async function GET(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { clientId } = await params;
  if (!ObjectId.isValid(clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }

  const parsed = parsePeriodQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  try {
    const summary = await getPerformanceSummary(new ObjectId(clientId), parsed.periodKey, parsed.custom);
    return NextResponse.json({ ok: true, data: summary }, { status: 200 });
  } catch (error) {
    console.error("[admin/analytics/clients/summary/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
