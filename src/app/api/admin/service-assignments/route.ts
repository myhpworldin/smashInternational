import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createServiceAssignmentSchema } from "@/shared/validation/serviceAssignments";
import { createAssignment, listAssignmentsForOnboarding } from "@/server/services/serviceAssignments.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const onboardingId = new URL(request.url).searchParams.get("onboardingId");
  if (!onboardingId) {
    return NextResponse.json({ ok: false, errors: ["onboardingId is required."] }, { status: 400 });
  }

  const records = await listAssignmentsForOnboarding(onboardingId);
  return NextResponse.json({ ok: true, records }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createServiceAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: ["Check the form and try again."] }, { status: 400 });
  }

  const result = await createAssignment(parsed.data, admin);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
