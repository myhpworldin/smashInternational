import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createUserByAdminSchema } from "@/shared/validation/adminUsers";
import { createUserByAdmin } from "@/server/services/adminUsers.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserByAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: ["Check the form and try again."] }, { status: 400 });
  }

  const result = await createUserByAdmin(
    {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone?.trim() || null,
      role: parsed.data.role,
      status: parsed.data.status ?? "active",
    },
    admin,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, user: result.user, temporaryPassword: result.temporaryPassword },
    { status: 201 },
  );
}
