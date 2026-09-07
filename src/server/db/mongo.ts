import "server-only";
import { MongoClient } from "mongodb";

// Cached on globalThis so warm serverless invocations (and dev HMR reloads)
// reuse one connection instead of opening a new one per request.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

// The env var is read lazily, on first actual use, rather than at module
// load — reading it at module scope makes `next build` fail wherever it
// evaluates this route (even without a request), before the env var exists.
export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI environment variable");
    }
    globalForMongo._mongoClientPromise = new MongoClient(uri).connect();
  }
  return globalForMongo._mongoClientPromise;
}
