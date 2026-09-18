import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { changeStaffAvailabilitySchema } from "@/shared/validation/staffAvailability";
import { setStaffAvailability } from "@/server/services/staffAvailability.service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = changeStaffAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: ["Check the form and try again."] }, { status: 400 });
  }

  const result = await setStaffAvailability(id, admin, parsed.data.availability, parsed.data.reason ?? null);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
  }

  return NextResponse.json({ ok: true, affectedAssignmentIds: result.affectedAssignmentIds }, { status: 200 });
}
