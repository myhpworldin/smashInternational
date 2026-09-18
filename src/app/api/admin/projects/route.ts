import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createProjectSchema } from "@/shared/validation/projects";
import { createProjectForAdmin } from "@/server/services/projects.service";

export const runtime = "nodejs";

// Stage 1 Phase 17 — the one write path AdminProjectsPanel (Phase 13)
// calls, via lib/admin-actions/operations.ts's saveProject. Admin-only;
// createProjectForAdmin itself re-validates that the given service
// engagement actually belongs to the given client before creating
// anything, so a tampered clientId/serviceEngagementId pair is rejected
// server-side regardless of what the form sent.
export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid project payload." }, { status: 400 });
  }

  if (!ObjectId.isValid(parsed.data.clientId) || !ObjectId.isValid(parsed.data.serviceEngagementId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await createProjectForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        serviceEngagementId: new ObjectId(parsed.data.serviceEngagementId),
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status,
        progress: parsed.data.progress,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        targetEndDate: parsed.data.targetEndDate ? new Date(parsed.data.targetEndDate) : undefined,
        milestones: parsed.data.milestones,
      },
      admin._id,
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ ok: true, project: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/projects] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
