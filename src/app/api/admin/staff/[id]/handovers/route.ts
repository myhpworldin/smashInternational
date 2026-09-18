import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { listHandoverRequiredForStaff } from "@/server/services/serviceAssignments.service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const records = await listHandoverRequiredForStaff(id);
  return NextResponse.json({ ok: true, records }, { status: 200 });
}
