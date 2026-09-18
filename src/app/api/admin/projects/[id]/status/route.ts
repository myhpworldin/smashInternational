import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { updateProjectStatusSchema } from "@/shared/validation/projects";
import { updateProjectStatusForAdmin } from "@/server/services/projects.service";

export const runtime = "nodejs";

// Stage 1 Phase 17 §12/§24 — the project status/progress update path.
// No Phase 13 admin UI calls this yet (AdminProjectsPanel only creates
// projects today) — the backend capability exists so whichever phase
// adds an edit-existing-project control can call it directly, matching
// the same transition-graph + idempotent-no-op pattern already proven
// for service engagements.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid status payload." }, { status: 400 });
  }

  try {
    const result = await updateProjectStatusForAdmin(
      new ObjectId(id),
      parsed.data.status,
      admin._id,
      parsed.data.progress,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ ok: true, project: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/projects/status] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
