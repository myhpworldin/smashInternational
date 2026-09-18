import { NextResponse } from "next/server";
import { getAuthorizedStaff } from "@/server/auth/dal";
import { listNotificationsForStaff } from "@/server/services/notifications.service";

export const runtime = "nodejs";

// Scoped to the caller's own id server-side — same pattern as
// /api/staff/assignments (Phase 1 audit §6/§10/§23).
export async function GET() {
  const staff = await getAuthorizedStaff();
  if (!staff) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const records = await listNotificationsForStaff(staff._id.toHexString());
  return NextResponse.json({ ok: true, records }, { status: 200 });
}
