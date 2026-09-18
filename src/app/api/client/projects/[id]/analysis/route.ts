import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { getProjectAnalysisForClient } from "@/server/services/analytics.service";

export const runtime = "nodejs";

// Stage 1 Phase 20 §16/§31/§33 — same ownership-checked-by-id pattern as
// the campaigns analysis route.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  try {
    const analysis = await getProjectAnalysisForClient(id, user.clientId);
    if (!analysis) {
      return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: analysis }, { status: 200 });
  } catch (error) {
    console.error("[client/projects/analysis/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
