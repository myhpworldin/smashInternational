import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { setBudgetAllocationsSchema } from "@/shared/validation/budget";
import { setBudgetAllocationsForAdmin } from "@/server/services/budget.service";

export const runtime = "nodejs";

// The per-service allocation editor's write path (AdminBudgetPanel, via
// lib/admin-actions/operations.ts's saveBudgetAllocations) — sets the
// total and every per-service allocation together in one call, alongside
// the existing total-only /api/admin/budget route.
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setBudgetAllocationsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid budget payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await setBudgetAllocationsForAdmin(
      new ObjectId(parsed.data.clientId),
      { total: parsed.data.total, allocations: parsed.data.allocations },
      admin._id,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, budget: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/budget/allocations] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
