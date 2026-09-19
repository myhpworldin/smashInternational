import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { generateReportSchema } from "@/shared/validation/reports";
import { generateMonthlyReportForAdmin } from "@/server/services/reports.service";

export const runtime = "nodejs";

// Stage 1 Phase 21 — generates (or regenerates in place, pre-publish) a
// monthly report for one client + one named calendar month. The only
// report type this phase builds a generator for (§22).
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid report generation payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }

  try {
    const result = await generateMonthlyReportForAdmin(new ObjectId(parsed.data.clientId), parsed.data.monthKey, admin);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, report: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/reports/generate] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
