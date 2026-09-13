import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { resolveOnboardingIdentity, deleteAsset } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!ObjectId.isValid(assetId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const { doc } = await resolveOnboardingIdentity();
    const deleted = await deleteAsset(new ObjectId(assetId), doc.clientId);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[onboarding/assets/DELETE] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
