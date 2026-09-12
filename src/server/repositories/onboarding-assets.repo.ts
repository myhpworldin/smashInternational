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
  createdAt: Date;
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
}): Promise<OnboardingAssetDoc> {
  const doc: OnboardingAssetDoc = { ...input, _id: new ObjectId(), createdAt: new Date() };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(assetId: ObjectId): Promise<OnboardingAssetDoc | null> {
  return (await collection()).findOne({ _id: assetId });
}

export async function listByOnboardingId(onboardingId: ObjectId): Promise<OnboardingAssetDoc[]> {
  return (await collection()).find({ onboardingId }).sort({ createdAt: -1 }).toArray();
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
