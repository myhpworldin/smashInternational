import "server-only";
import { GridFSBucket, ObjectId, type GridFSBucketReadStream } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";

// Real byte storage for onboarding assets, backed by the same MongoDB Atlas
// cluster already provisioned (MONGODB_URI) — no new service, credentials,
// or dependency. GridFS is part of the `mongodb` driver already installed.
const BUCKET_NAME = "onboarding_assets";

async function getBucket(): Promise<GridFSBucket> {
  const client = await getMongoClient();
  return new GridFSBucket(client.db(), { bucketName: BUCKET_NAME });
}

// The MIME type is tracked in the onboarding_assets metadata document (and
// used to set Content-Type when serving the file back), not in GridFS
// itself — this driver version's write-stream options don't include a
// contentType field.
export async function uploadBuffer(buffer: Buffer, filename: string): Promise<ObjectId> {
  const bucket = await getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename);
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

export async function openDownloadStream(fileId: ObjectId): Promise<GridFSBucketReadStream> {
  const bucket = await getBucket();
  return bucket.openDownloadStream(fileId);
}

export async function deleteFile(fileId: ObjectId): Promise<void> {
  const bucket = await getBucket();
  await bucket.delete(fileId);
}
