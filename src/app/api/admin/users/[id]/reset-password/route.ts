import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { resetUserPassword } from "@/server/services/adminUsers.service";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const result = await resetUserPassword(id, admin);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
  }

  return NextResponse.json({ ok: true, temporaryPassword: result.temporaryPassword }, { status: 200 });
}
