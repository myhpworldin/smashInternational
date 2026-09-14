import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role } from "@/shared/types/user";
import type { AdminUserStatus } from "@/shared/types/adminUser";

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
  // Additive for Stage 2 Phase 3 (admin-created users) — undefined on any
  // doc created through public signup, which never sets these. Only
  // createByAdmin() below writes them, always together.
  name?: string;
  phone?: string | null;
  status?: AdminUserStatus;
  mustChangePassword?: boolean;
  createdBy?: ObjectId | null;
  updatedAt?: Date;
  // Additive for Stage 2 Phase 4 — undefined on any doc predating it,
  // always treated as 1 (see verifySession in dal.ts). Bumped whenever a
  // session must be forced to re-authenticate (block, admin password
  // reset); never decremented.
  sessionVersion?: number;
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
    sessionVersion: 1,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

// Admin-created accounts skip the public signup/OTP path entirely: the
// admin vouches for the email (emailVerified: true) and a temporary
// password is issued instead, which is why mustChangePassword is always
// true here — see createUserByAdmin() in adminUsers.service.ts for the
// password generation/hashing that happens before this is called.
export async function createByAdmin(input: {
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AdminUserStatus;
  passwordHash: string;
  createdBy: ObjectId;
}): Promise<UserDoc> {
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    clientId: null,
    emailVerified: true,
    otp: null,
    createdAt: now,
    name: input.name,
    phone: input.phone,
    status: input.status,
    mustChangePassword: true,
    createdBy: input.createdBy,
    updatedAt: now,
    sessionVersion: 1,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

// The user's own completion of a forced password change (first login on
// an admin-created account, or after an admin-initiated reset) — distinct
// from resetPasswordByAdmin above, which sets mustChangePassword to true;
// this is the only place it's ever set back to false. sessionVersion is
// still bumped, same reasoning as resetPasswordByAdmin: whatever session
// carried the temporary credential should not silently remain valid
// forever just because the DB write happened while it was logged in — the
// caller (changePassword in auth.service.ts) immediately reissues a fresh
// session at the new version in the same request.
export async function completePasswordChange(
  id: ObjectId,
  passwordHash: string,
  sessionVersion: number,
): Promise<void> {
  await (await collection()).updateOne(
    { _id: id },
    { $set: { passwordHash, mustChangePassword: false, sessionVersion, updatedAt: new Date() } },
  );
}

// Fetches every user for the admin list. No pagination/filtering yet —
// filtering happens client-side (UserFilters) — so this is bounded rather
// than unlimited, to keep the page from growing unbounded query cost as
// the table grows past what a single admin screen is meant for.
export async function listAll(limit = 500): Promise<UserDoc[]> {
  return (await collection()).find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

// Active (non-blocked) admins — used to stop a role change or block
// action from removing the organization's last admin. A doc with no
// `status` field predates blocking entirely and counts as active, same
// default used everywhere else.
export async function countActiveAdmins(): Promise<number> {
  return (await collection()).countDocuments({ role: "admin", status: { $ne: "blocked" } });
}

// Generic non-sensitive profile fields only (name/phone/email) — role,
// password, and status each have their own dedicated function below so a
// generic "edit" can never touch them.
export async function updateProfile(
  id: ObjectId,
  updates: { name?: string; phone?: string | null; email?: string },
): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { ...updates, updatedAt: new Date() } });
}

export async function updateRole(id: ObjectId, role: Role): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { role, updatedAt: new Date() } });
}

// `sessionVersion` is only passed when the caller wants existing sessions
// forced to re-authenticate (blocking) — omitted for unblocking, which
// only needs to flip status back.
export async function setStatus(id: ObjectId, status: AdminUserStatus, sessionVersion?: number): Promise<void> {
  const setFields: { status: AdminUserStatus; updatedAt: Date; sessionVersion?: number } = {
    status,
    updatedAt: new Date(),
  };
  if (sessionVersion !== undefined) setFields.sessionVersion = sessionVersion;
  await (await collection()).updateOne({ _id: id }, { $set: setFields });
}

// Always bumps sessionVersion in the same write — an admin-issued
// temporary password must invalidate whatever session the user was
// already holding (see verifySession in dal.ts), not just gate the next
// login behind mustChangePassword.
export async function resetPasswordByAdmin(id: ObjectId, passwordHash: string, sessionVersion: number): Promise<void> {
  await (await collection()).updateOne(
    { _id: id },
    { $set: { passwordHash, mustChangePassword: true, sessionVersion, updatedAt: new Date() } },
  );
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
