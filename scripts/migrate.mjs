// Idempotent index setup — there's no ORM/migration framework in this
// project (raw mongodb driver throughout), so "migration" here means
// creating indexes safely re-runnable against the live database.
//
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();

    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    // No separate "clients" collection anymore — onboarding has no login,
    // so there's no pre-provisioned account to link to. Each onboarding
    // record is self-contained, identified by accessToken.
    await db.collection("onboarding").createIndex({ clientId: 1 }, { unique: true });
    await db.collection("onboarding").createIndex({ accessToken: 1 }, { unique: true });
    await db.collection("onboarding").createIndex({ status: 1 });
    await db.collection("onboarding").createIndex({ submittedAt: 1 });

    await db.collection("onboarding_assets").createIndex({ onboardingId: 1 });
    await db.collection("onboarding_assets").createIndex({ clientId: 1 });

    console.log("Indexes created/verified.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
