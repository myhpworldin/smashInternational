import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { verifySession } from "@/server/auth/dal";
import { readAccessToken } from "@/server/onboarding/access";
import { getAssetById, getDraftByAccessToken } from "@/server/services/onboarding.service";
import { openDownloadStream } from "@/server/storage/gridfs";

export const runtime = "nodejs";

// The one place asset bytes are ever served from. The visitor's
// onboarding_access cookie must resolve to the same client that owns the
// asset — an admin session bypasses that check. Never rely on the
// frontend not linking to another visitor's asset id, since ids are
// guessable ObjectIds; the actual gate is here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!ObjectId.isValid(assetId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const asset = await getAssetById(new ObjectId(assetId));
  if (!asset) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const session = await verifySession();
  const isAdmin = session?.role === "admin";

  if (!isAdmin) {
    const token = await readAccessToken();
    const draft = token ? await getDraftByAccessToken(token) : null;
    if (!draft || !draft.clientId.equals(asset.clientId)) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
  }

  const downloadStream = await openDownloadStream(asset.fileId);
  const webStream = Readable.toWeb(downloadStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.sizeBytes),
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalFilename)}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
