import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { updateReportSchema } from "@/shared/validation/reports";
import { getReportForAdmin, updateReportContentForAdmin } from "@/server/services/reports.service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const report = await getReportForAdmin(id);
  if (!report) {
    return NextResponse.json({ ok: false, message: "Report not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report }, { status: 200 });
}

// Content-only edits (title/executive summary/optimization notes/next
// month plan) — never a status change, and rejected outright once a
// report is published or archived (§26/§39; the calculated snapshot
// fields aren't editable at all through this route, only through
// generate/regenerate).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid report update payload." }, { status: 400 });
  }

  try {
    const result = await updateReportContentForAdmin(new ObjectId(id), parsed.data, admin);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, report: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/reports/PATCH] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
