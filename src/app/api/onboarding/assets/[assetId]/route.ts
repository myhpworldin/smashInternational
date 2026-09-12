import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getOrCreateAnonymousDraft, deleteAsset } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!ObjectId.isValid(assetId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const doc = await getOrCreateAnonymousDraft();
  const deleted = await deleteAsset(new ObjectId(assetId), doc.clientId);
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
