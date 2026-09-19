import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { listReportsForAdmin } from "@/server/services/reports.service";

export const runtime = "nodejs";

// Stage 1 Phase 21 — admin list of a client's reports across every
// lifecycle status (draft/ready/published/archived), unlike the
// client-facing list which only ever shows published ones.
export async function GET(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId || !ObjectId.isValid(clientId)) {
    return NextResponse.json({ ok: false, message: "A valid clientId is required." }, { status: 400 });
  }

  try {
    const reports = await listReportsForAdmin(new ObjectId(clientId));
    return NextResponse.json({ ok: true, reports }, { status: 200 });
  } catch (error) {
    console.error("[admin/reports/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
