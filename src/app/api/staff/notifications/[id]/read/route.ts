import { NextResponse } from "next/server";
import { getAuthorizedStaff } from "@/server/auth/dal";
import { markNotificationRead } from "@/server/services/notifications.service";

export const runtime = "nodejs";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getAuthorizedStaff();
  if (!staff) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const result = await markNotificationRead(id, staff._id.toHexString());
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
