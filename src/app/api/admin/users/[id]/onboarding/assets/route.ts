import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { assetMetadataSchema } from "@/shared/validation/onboarding";
import { ASSET_TYPES, MAX_ASSET_SIZE_BYTES, isAllowedAssetMime } from "@/shared/types/onboarding";
import { resolveOnboardingForAdmin, addAsset, listAssets, reorderAssets } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

const GENERIC_ERROR = { ok: false, message: "Something went wrong. Try again shortly." };

// Admin-assisted mirror of /api/onboarding/assets — same upload rules,
// same storage (GridFS + Cloudinary dual-write via addAsset), same
// metadata/association logic. Only identity resolution differs (an
// explicit target client, never the caller's own session).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }
    const assets = await listAssets(identity.data._id);
    return NextResponse.json({ ok: true, assets }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/onboarding/assets/GET] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
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

  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Stored against the CLIENT, not the admin who happened to upload it
    // (Phase 29 §11/§39) — uploadedByUserId records the real actor for
    // accountability, exactly like the client route's own `null` there
    // records "no session" for an anonymous upload; ownership (clientId)
    // is untouched by who uploaded it.
    const asset = await addAsset(identity.data._id, identity.data.clientId, admin._id, parsed.data, buffer);

    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (error) {
    console.error("[admin/users/onboarding/assets/POST] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const assetIds = body?.assetIds;

  if (!Array.isArray(assetIds) || assetIds.some((assetId) => typeof assetId !== "string" || !ObjectId.isValid(assetId))) {
    return NextResponse.json({ ok: false, message: "Invalid asset id list." }, { status: 400 });
  }

  try {
    const identity = await resolveOnboardingForAdmin(id, admin);
    if (!identity.ok) {
      return NextResponse.json({ ok: false, errors: identity.errors }, { status: 404 });
    }

    const result = await reorderAssets(
      identity.data._id,
      identity.data.clientId,
      assetIds.map((assetId) => new ObjectId(assetId)),
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/onboarding/assets/PATCH] failed:", error);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
