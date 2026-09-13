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

    const clientPromise = new MongoClient(uri).connect();
    globalForMongo._mongoClientPromise = clientPromise;

    // A Promise is truthy whether it resolves or rejects, so without this
    // a single transient failure (a DNS hiccup, a brief network drop)
    // gets cached forever — every request after that replays the exact
    // same rejected promise, permanently, until the process restarts.
    // Clearing the cache on failure lets the next call retry fresh.
    clientPromise.catch(() => {
      if (globalForMongo._mongoClientPromise === clientPromise) {
        globalForMongo._mongoClientPromise = undefined;
      }
    });
  }
  return globalForMongo._mongoClientPromise;
}
