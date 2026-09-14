import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { changeUserRoleSchema } from "@/shared/validation/adminUsers";
import { updateUserRole } from "@/server/services/adminUsers.service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = changeUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: ["Check the form and try again."] }, { status: 400 });
  }

  const result = await updateUserRole(id, admin, parsed.data.role);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
