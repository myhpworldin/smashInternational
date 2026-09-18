import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { saveDailyRecordSchema } from "@/shared/validation/dailyRecords";
import { saveDailyRecordForAdmin } from "@/server/services/dailyRecords.service";

export const runtime = "nodejs";

// Stage 1 Phase 19 — the write path DailyDataEntryClient (Phase 14) calls
// via lib/admin-actions/operations.ts's saveDailyRecord. Same
// create-or-update-on-natural-key semantics as the service layer: no
// separate PATCH route, since "editing an existing day's record" and
// "creating a new one" are the exact same call from the frontend's side
// (§26 — the client only ever sends the full record, keyed by
// client+service+campaign/project+reportingDate).
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveDailyRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid daily record payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }
  if (parsed.data.campaignOrProjectId !== null && !ObjectId.isValid(parsed.data.campaignOrProjectId)) {
    return NextResponse.json({ ok: false, message: "Invalid campaign/project id." }, { status: 400 });
  }

  try {
    const result = await saveDailyRecordForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        serviceId: parsed.data.serviceId,
        campaignOrProjectId: parsed.data.campaignOrProjectId ? new ObjectId(parsed.data.campaignOrProjectId) : null,
        reportingDate: parsed.data.reportingDate,
        metrics: parsed.data.metrics,
        projectProgress: parsed.data.projectProgress,
        notes: parsed.data.notes,
      },
      admin,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, record: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/daily-records] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
