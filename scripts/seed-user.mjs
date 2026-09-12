// One-off provisioning script for admin accounts — the only login role
// left (client onboarding is now the public, cookie-based /onboarding
// flow, no account). Duplicates the scrypt hashing from
// src/server/auth/password.ts rather than importing it, since that file
// pulls in the "server-only" marker package which throws outside a Next
// server bundle.
//
// Usage: node --env-file=.env.local scripts/seed-user.mjs <email> <password>
import { randomBytes, scrypt } from "node:crypto";
import { MongoClient } from "mongodb";

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: node --env-file=.env.local scripts/seed-user.mjs <email> <password>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const passwordHash = await hashPassword(password);

    const result = await db.collection("users").updateOne(
      { email: email.toLowerCase() },
      {
        $set: { email: email.toLowerCase(), passwordHash, role: "admin", clientId: null },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    console.log(result.upsertedCount ? "Created" : "Updated", `admin user: ${email}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
