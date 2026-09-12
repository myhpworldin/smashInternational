import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifySession, getCurrentUser } from "@/server/auth/dal";
import { reviewDecisionSchema } from "@/shared/validation/onboarding";
import { reviewSubmission } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid review payload." }, { status: 400 });
  }

  const result = await reviewSubmission(
    new ObjectId(id),
    admin._id,
    parsed.data.decision,
    parsed.data.notes ?? null,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
