import { NextRequest, NextResponse } from "next/server";
import { assetMetadataSchema } from "@/shared/validation/onboarding";
import { ASSET_TYPES, MAX_ASSET_SIZE_BYTES, isAllowedAssetMime } from "@/shared/types/onboarding";
import { getOrCreateAnonymousDraft, addAsset, listAssets } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function GET() {
  const doc = await getOrCreateAnonymousDraft();
  const assets = await listAssets(doc._id);
  return NextResponse.json({ ok: true, assets }, { status: 200 });
}

// Multipart upload — the actual bytes travel in this request (to GridFS,
// see server/storage/gridfs.ts). Metadata (filename/mime/size) is read off
// the real uploaded File, never accepted as separate client-asserted JSON,
// so a client can't claim a size or type that doesn't match what was
// actually sent.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, message: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const assetTypeRaw = formData.get("assetType");

  if (!(file instanceof File) || typeof assetTypeRaw !== "string") {
    return NextResponse.json({ ok: false, message: "Missing file or asset type." }, { status: 400 });
  }

  const metadata = {
    assetType: assetTypeRaw,
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };

  const parsed = assetMetadataSchema.safeParse(metadata);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid file metadata.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!isAllowedAssetMime(parsed.data.assetType, parsed.data.mimeType)) {
    const allowedLabel = ASSET_TYPES.find((t) => t.id === parsed.data.assetType)?.label;
    return NextResponse.json(
      { ok: false, message: `That file type isn't supported for ${allowedLabel}.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return NextResponse.json({ ok: false, message: "File is too large." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const doc = await getOrCreateAnonymousDraft();
  const asset = await addAsset(doc._id, doc.clientId, null, parsed.data, buffer);

  return NextResponse.json({ ok: true, asset }, { status: 201 });
}
