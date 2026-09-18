import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { setBudgetTotalSchema } from "@/shared/validation/budget";
import { setBudgetTotalForAdmin } from "@/server/services/budget.service";

export const runtime = "nodejs";

// Stage 1 Phase 18 — the write path AdminBudgetPanel (Phase 13) calls via
// lib/admin-actions/operations.ts's saveBudgetSnapshot.
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setBudgetTotalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid budget payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await setBudgetTotalForAdmin(new ObjectId(parsed.data.clientId), parsed.data.total, admin._id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, budget: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/budget] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
