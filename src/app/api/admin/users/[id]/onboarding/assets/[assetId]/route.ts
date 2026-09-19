import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { resolveOnboardingForAdmin, deleteAsset } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

// Admin-assisted mirror of /api/onboarding/assets/[assetId] — deleteAsset
// itself is already scoped to the owning clientId (a mismatch is a silent
// no-op there, never a leak), so this only needs to resolve the right
// clientId for an explicit target client instead of the caller's session.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id, assetId } = await params;
  if (!ObjectId.isValid(assetId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }

    const deleted = await deleteAsset(new ObjectId(assetId), identity.data.clientId);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/onboarding/assets/DELETE] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
