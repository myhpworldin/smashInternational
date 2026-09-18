import { NextResponse } from "next/server";
import { getAuthorizedStaff } from "@/server/auth/dal";
import { listActiveAssignmentsForStaff } from "@/server/services/serviceAssignments.service";

export const runtime = "nodejs";

// Server-side scoped to the caller's own id — never accepts a staffUserId
// from the client (Phase 1 audit §6/§23: assignment-based authorization
// must be enforced here, not left to the frontend to only ever ask for
// its own data).
export async function GET() {
  const staff = await getAuthorizedStaff();
  if (!staff) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const records = await listActiveAssignmentsForStaff(staff._id.toHexString());
  return NextResponse.json({ ok: true, records }, { status: 200 });
}
