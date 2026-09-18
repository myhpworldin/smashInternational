import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { reviewBudgetChangeRequestSchema } from "@/shared/validation/budget";
import { rejectBudgetChangeRequest } from "@/server/services/budget.service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reviewBudgetChangeRequestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  try {
    const result = await rejectBudgetChangeRequest(new ObjectId(id), admin._id, parsed.data.reviewNote);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
    }
    return NextResponse.json({ ok: true, request: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/budget-requests/reject] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
