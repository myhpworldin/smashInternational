import "server-only";
import { getMongoClient } from "@/server/db/mongo";

const DB_NAME = process.env.MONGODB_DB || "smash_international";
const COLLECTION = "notify_signups";

export async function save(email: string): Promise<void> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection(COLLECTION);

  // Upsert on email so a repeat submission updates nothing instead of
  // creating a duplicate row — no unique index required for this to hold.
  await collection.updateOne(
    { email },
    { $setOnInsert: { email, createdAt: new Date() } },
    { upsert: true },
  );
}
