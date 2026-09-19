import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { publishReportForAdmin } from "@/server/services/reports.service";

export const runtime = "nodejs";

// Stage 1 Phase 21 §17/§29 — the one action that makes a report visible
// to the client (toClientReportStatus only ever maps "published" to a
// client-visible status). Admin-only, same as every other write route.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await publishReportForAdmin(new ObjectId(id), admin);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, report: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/reports/publish] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
