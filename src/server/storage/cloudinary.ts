import "server-only";
import { randomBytes } from "node:crypto";
import { v2 as cloudinaryUploader, type UploadApiResponse } from "cloudinary";
import type { AssetType } from "@/shared/types/onboarding";

// SMASH's Cloudinary integration — a fresh, SMASH-only setup (see the
// Phase 1 audit: no prior Cloudinary usage existed anywhere in this
// codebase), not a rewrite of something already wired into an upload flow.

// Every SMASH asset lives under this one namespace, isolated from the
// account's other projects (ambo, inspiretechnologies, myhpworld,
// myhpworld-test, nino, samples) — never write outside smash-crm/*.
const SMASH_ROOT = "smash-crm";

// Only categories with an actual, evidenced use in the SMASH codebase today
// (see the onboarding asset types in shared/types/onboarding.ts) — not the
// full generic set, so this doesn't grow folders nothing ever populates.
export type SmashAssetCategory = "branding" | "company" | "documents";

// Maps the onboarding flow's real asset types onto the three approved
// SMASH categories — the one place this mapping lives, so no upload call
// site has to know or duplicate it.
const CATEGORY_BY_ASSET_TYPE: Record<AssetType, SmashAssetCategory> = {
  logo: "branding",
  brand_guidelines: "branding",
  product_images: "company",
  catalogues: "company",
  brochures: "company",
  existing_creatives: "documents",
};

// Configured once per process and cached on globalThis, mirroring
// getMongoClient's pattern (server/db/mongo.ts) — env vars are read lazily,
// on first actual use, so `next build` doesn't fail evaluating this module
// before the environment exists.
const globalForCloudinary = globalThis as unknown as {
  _cloudinaryConfigured?: boolean;
};

function ensureConfigured(): typeof cloudinaryUploader {
  if (!globalForCloudinary._cloudinaryConfigured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET environment variable",
      );
    }

    cloudinaryUploader.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      // Uploads are signed server-side — the API secret never leaves this
      // module, let alone reaches client code.
      secure: true,
    });
    globalForCloudinary._cloudinaryConfigured = true;
  }
  return cloudinaryUploader;
}

// Server-only accessor for the configured SDK instance — every future
// upload/destroy call should go through this rather than importing
// "cloudinary" and configuring it again elsewhere.
export function getCloudinaryClient(): typeof cloudinaryUploader {
  return ensureConfigured();
}

// development -> smash-crm/development, production -> smash-crm/production.
// Same NODE_ENV check already used for environment-sensitive behavior
// elsewhere in this codebase (server/auth/session.ts, proxy.ts).
export function getSmashCloudinaryBaseFolder(): string {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  return `${SMASH_ROOT}/${environment}`;
}

// One authoritative place child paths are built from the base folder, so a
// category path is never hand-assembled (and never hardcoded) at each call
// site — e.g. getSmashCloudinaryFolder("branding") ->
// "smash-crm/production/branding".
export function getSmashCloudinaryFolder(category: SmashAssetCategory): string {
  return `${getSmashCloudinaryBaseFolder()}/${category}`;
}

export function getSmashCategoryForAssetType(assetType: AssetType): SmashAssetCategory {
  return CATEGORY_BY_ASSET_TYPE[assetType];
}

export type SmashCloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  // Cloudinary's own classification of what it stored (image/video/raw) —
  // required again on delete, since destroy() must target the same
  // resource_type the asset was actually uploaded as.
  resourceType: string;
};

// Uploads one onboarding asset's bytes into its category folder, scoped
// under the owning onboarding record so two clients' files never collide —
// smash-crm/{env}/{category}/{onboardingId}/{assetType}_{shortId}. The
// short random suffix (not the original filename) covers a client
// uploading the same assetType twice, without leaking any filename/PII into
// the public_id.
export async function uploadSmashAsset(params: {
  buffer: Buffer;
  assetType: AssetType;
  onboardingId: string;
}): Promise<SmashCloudinaryUploadResult> {
  const client = getCloudinaryClient();
  const folder = getSmashCloudinaryFolder(getSmashCategoryForAssetType(params.assetType));
  const shortId = randomBytes(4).toString("hex");
  const publicId = `${params.onboardingId}/${params.assetType}_${shortId}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "auto" },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(uploadResult);
      },
    );
    uploadStream.end(params.buffer);
  });

  return { publicId: result.public_id, secureUrl: result.secure_url, resourceType: result.resource_type };
}

// Deletes exactly one SMASH asset by its own public_id (+ the resource_type
// it was uploaded as) — never a folder or bulk operation, so this can't
// reach outside the single asset it's given, let alone another project's
// namespace.
export async function deleteSmashAsset(publicId: string, resourceType: string): Promise<void> {
  const client = getCloudinaryClient();
  await client.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}
