import "server-only";
import { getMongoClient } from "@/server/db/mongo";

const COLLECTION = "notify_signups";

export async function save(email: string): Promise<void> {
  const client = await getMongoClient();
  // No name passed: uses whatever database MONGODB_URI's path names.
  const collection = client.db().collection(COLLECTION);

  // Upsert on email so a repeat submission updates nothing instead of
  // creating a duplicate row — no unique index required for this to hold.
  await collection.updateOne(
    { email },
    { $setOnInsert: { email, createdAt: new Date() } },
    { upsert: true },
  );
}
