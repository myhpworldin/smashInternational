import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role } from "@/shared/types/user";

const COLLECTION = "users";

export type OtpState = {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
};

export type UserDoc = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  clientId: ObjectId | null;
  // Additive for Stage 2 Phase 2 — absent (undefined) on any pre-existing
  // doc (e.g. the admin account created before this phase), which is why
  // every read of these treats a missing value as "not verified" / "no
  // OTP in flight" rather than assuming they're always present.
  emailVerified?: boolean;
  otp?: OtpState | null;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<UserDoc>(COLLECTION);
}

export async function findByEmail(email: string): Promise<UserDoc | null> {
  return (await collection()).findOne({ email });
}

export async function findById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await collection()).findOne({ _id: new ObjectId(id) });
}

export async function create(input: {
  email: string;
  passwordHash: string;
  role: Role;
  clientId?: ObjectId | null;
  emailVerified?: boolean;
}): Promise<UserDoc> {
  const doc: UserDoc = {
    _id: new ObjectId(),
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    clientId: input.clientId ?? null,
    emailVerified: input.emailVerified ?? false,
    otp: null,
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

// Used when an unverified signup tries again with the same email — reuses
// the existing document (updates the password in case it changed) rather
// than inserting a second one, so an abandoned signup never produces a
// duplicate account.
export async function replaceUnverifiedSignup(
  userId: ObjectId,
  passwordHash: string,
): Promise<void> {
  await (await collection()).updateOne({ _id: userId }, { $set: { passwordHash } });
}

export async function setOtp(userId: ObjectId, otp: OtpState): Promise<void> {
  await (await collection()).updateOne({ _id: userId }, { $set: { otp } });
}

export async function incrementOtpAttempts(userId: ObjectId): Promise<void> {
  await (await collection()).updateOne({ _id: userId }, { $inc: { "otp.attempts": 1 } });
}

// Verification success clears the OTP (one-time use) in the same write
// that marks the account verified — there is no window where the account
// is verified but the code could still be replayed.
export async function markEmailVerified(userId: ObjectId): Promise<void> {
  await (await collection()).updateOne(
    { _id: userId },
    { $set: { emailVerified: true, otp: null } },
  );
}

// Same one-time-use clearing as markEmailVerified, for an account that's
// already verified — used by login-OTP, which never touches emailVerified
// itself.
export async function clearOtp(userId: ObjectId): Promise<void> {
  await (await collection()).updateOne({ _id: userId }, { $set: { otp: null } });
}

// Links an authenticated account to the onboarding record it owns — see
// resolveOnboardingIdentity in onboarding.service.ts for where this gets
// set (claiming a draft the first time a logged-in client's session
// touches any onboarding endpoint) and why it's never client-supplied.
export async function setClientId(userId: ObjectId, clientId: ObjectId): Promise<void> {
  await (await collection()).updateOne({ _id: userId }, { $set: { clientId } });
}
