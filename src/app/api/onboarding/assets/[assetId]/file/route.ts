import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { verifySession } from "@/server/auth/dal";
import { getAssetById, resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { openDownloadStream } from "@/server/storage/gridfs";
import { isOwnedByClient } from "@/server/auth/ownership";

export const runtime = "nodejs";

// The one place asset bytes are ever served from. The requester's resolved
// identity (session if logged in, cookie if not — see
// resolveOnboardingIdentity) must own the client this asset belongs to —
// an admin session bypasses that check. Never rely on the frontend not
// linking to another client's asset id, since ids are guessable
// ObjectIds; the actual gate is here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!ObjectId.isValid(assetId)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const asset = await getAssetById(new ObjectId(assetId));
    if (!asset) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const session = await verifySession();
    const isAdmin = session?.role === "admin";

    if (!isAdmin) {
      const { doc } = await resolveOnboardingIdentity();
      if (!isOwnedByClient(asset.clientId, doc.clientId)) {
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
  } catch (error) {
    console.error("[onboarding/assets/file] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
