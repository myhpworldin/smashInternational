import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { AssetType } from "@/shared/types/onboarding";

const COLLECTION = "onboarding_assets";

export type OnboardingAssetDoc = {
  _id: ObjectId;
  onboardingId: ObjectId;
  clientId: ObjectId;
  // Null under the no-login onboarding flow — there is no user account
  // behind an anonymous upload.
  uploadedByUserId: ObjectId | null;
  assetType: AssetType;
  originalFilename: string;
  fileId: ObjectId; // GridFS file id in the onboarding_assets bucket — the real bytes
  mimeType: string;
  sizeBytes: number;
  // Display order within this onboarding's asset list — lower sorts first.
  // Assigned append-style on upload (see create()); absent on any asset
  // predating this field, treated as "before every explicitly ordered
  // asset" by the listing sort (see listByOnboardingId).
  order?: number;
  createdAt: Date;
  // Cloudinary dual-write (Phase 4 of the Cloudinary restructure) — absent
  // on assets uploaded before this, and left absent (not retried) if the
  // Cloudinary upload itself failed for a given asset; GridFS via `fileId`
  // remains the source of truth either way.
  cloudinaryPublicId?: string;
  cloudinarySecureUrl?: string;
  cloudinaryResourceType?: string;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<OnboardingAssetDoc>(COLLECTION);
}

export async function create(input: {
  onboardingId: ObjectId;
  clientId: ObjectId;
  uploadedByUserId: ObjectId | null;
  assetType: AssetType;
  originalFilename: string;
  fileId: ObjectId;
  mimeType: string;
  sizeBytes: number;
  cloudinaryPublicId?: string;
  cloudinarySecureUrl?: string;
  cloudinaryResourceType?: string;
}): Promise<OnboardingAssetDoc> {
  const coll = await collection();
  // Appends to the end of this onboarding's list — a plain count is good
  // enough here (small, per-record lists; no need for a max-order lookup).
  const order = await coll.countDocuments({ onboardingId: input.onboardingId });
  const doc: OnboardingAssetDoc = { ...input, _id: new ObjectId(), order, createdAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function findById(assetId: ObjectId): Promise<OnboardingAssetDoc | null> {
  return (await collection()).findOne({ _id: assetId });
}

// Ascending by `order`; MongoDB sorts a missing field as lowest, so any
// asset that predates the `order` field (never backfilled) simply sorts
// ahead of every explicitly ordered one — which also happens to match
// "oldest upload first", a reasonable default until a reorder assigns
// explicit values to the whole list (see reorder() below).
export async function listByOnboardingId(onboardingId: ObjectId): Promise<OnboardingAssetDoc[]> {
  return (await collection()).find({ onboardingId }).sort({ order: 1, createdAt: 1 }).toArray();
}

// Applies a full new ordering in one go — `assetIds` must be every asset
// currently in this onboarding's list, in the desired order; each gets its
// array index as its new `order`. Scoped by clientId so one client can
// never reorder (or, via a crafted id, touch) another's assets.
export async function reorder(
  onboardingId: ObjectId,
  clientId: ObjectId,
  assetIds: ObjectId[],
): Promise<void> {
  if (assetIds.length === 0) return;
  const coll = await collection();
  await coll.bulkWrite(
    assetIds.map((assetId, index) => ({
      updateOne: {
        filter: { _id: assetId, onboardingId, clientId },
        update: { $set: { order: index } },
      },
    })),
  );
}

// Scoped by clientId as well as _id — a client id mismatch means "not found",
// not "forbidden", so this alone is enough to prevent cross-client deletes.
// Returns the deleted doc (not just a boolean) so the caller can also delete
// the underlying GridFS bytes by fileId.
export async function deleteOwnedByClient(
  assetId: ObjectId,
  clientId: ObjectId,
): Promise<OnboardingAssetDoc | null> {
  return (await collection()).findOneAndDelete({ _id: assetId, clientId });
}
