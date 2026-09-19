import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role, StaffAvailability } from "@/shared/types/user";
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
  // Additive for Staff Continuity Phase 2 — only ever set on role:"staff"
  // docs, undefined everywhere else (including staff docs predating this
  // field, which every read treats as "available" — see
  // staffAvailability.service.ts). Deliberately separate from `status`:
  // that gates authentication, this gates whether the person can keep
  // owning active service assignments.
  availability?: StaffAvailability;
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
    availability: input.role === "staff" ? "available" : undefined,
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

export async function updateRole(
  id: ObjectId,
  role: Role,
  session?: import("mongodb").ClientSession,
): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { role, updatedAt: new Date() } }, { session });
}

// `sessionVersion` is only passed when the caller wants existing sessions
// forced to re-authenticate (blocking) — omitted for unblocking, which
// only needs to flip status back.
export async function setStatus(
  id: ObjectId,
  status: AdminUserStatus,
  sessionVersion?: number,
  session?: import("mongodb").ClientSession,
): Promise<void> {
  const setFields: { status: AdminUserStatus; updatedAt: Date; sessionVersion?: number } = {
    status,
    updatedAt: new Date(),
  };
  if (sessionVersion !== undefined) setFields.sessionVersion = sessionVersion;
  await (await collection()).updateOne({ _id: id }, { $set: setFields }, { session });
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

// The other side of setClientId — used to check whether an onboarding
// record found via the anonymous access-token cookie already belongs to
// a *different* account before letting a logged-in session claim it (see
// resolveOnboardingIdentity). Without this check, a stale or shared
// onboarding_access cookie — e.g. the same browser previously used for
// another client account — would silently transfer that other client's
// onboarding data onto whoever logs in next.
export async function findByOnboardingClientId(clientId: ObjectId): Promise<UserDoc | null> {
  return (await collection()).findOne({ clientId });
}

// `session` threads a Mongo client session through when the caller is
// running this inside a transaction (see staffAvailability.service.ts,
// which must never leave availability changed without also resolving the
// affected assignments — see MongoClient docs on ClientSession).
export async function setAvailability(
  id: ObjectId,
  availability: StaffAvailability,
  session?: import("mongodb").ClientSession,
): Promise<void> {
  await (await collection()).updateOne(
    { _id: id },
    { $set: { availability, updatedAt: new Date() } },
    { session },
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Name/email lookup for the handover history search (Phase 5 §15) — same
// "resolve to ids, filter another collection" approach as
// onboarding.repo.ts's searchIdsByCompanyName.
export async function searchStaffIds(q: string): Promise<ObjectId[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const regex = new RegExp(escapeRegex(trimmed), "i");
  const docs = await (await collection())
    .find({ role: "staff", $or: [{ name: regex }, { email: regex }] }, { projection: { _id: 1 } })
    .toArray();
  return docs.map((d) => d._id);
}

// Staff whose availability currently blocks them from continuing active
// work (Phase 5 §4/§17) — the population the handover dashboard reviews.
// Mirrors the "blocksContinuedWork" rule in staffAvailability.service.ts:
// anything other than "available".
export async function listUnavailableStaff(): Promise<UserDoc[]> {
  return (await collection())
    .find({ role: "staff", availability: { $in: ["on_leave", "unavailable", "departed"] } })
    .sort({ name: 1 })
    .toArray();
}

// Staff eligible to *receive a new assignment* right now (the "assign
// staff" dropdown on Onboarding Detail) — same eligibility rule as
// countEligibleStaff, just returning the rows instead of a count.
export async function listAssignableStaff(): Promise<UserDoc[]> {
  return (await collection())
    .find({
      role: "staff",
      status: { $ne: "blocked" },
      $or: [{ availability: "available" }, { availability: { $exists: false } }],
    })
    .sort({ name: 1 })
    .toArray();
}

// Eligibility for receiving a handed-over assignment (Phase 1 audit §14):
// an active, non-blocked staff account currently marked available. There
// is no service-specific capability field yet (a documented gap — see
// the Phase 1 report) so this is the full eligibility check for now,
// deliberately excluding one staff id (the departing owner can never be
// their own replacement).
export async function countEligibleStaff(excludeStaffUserId: ObjectId): Promise<number> {
  return (await collection()).countDocuments({
    role: "staff",
    _id: { $ne: excludeStaffUserId },
    status: { $ne: "blocked" },
    $or: [{ availability: "available" }, { availability: { $exists: false } }],
  });
}

// Hard delete — see deleteUser in adminUsers.service.ts for the safety
// checks (never self, never the last admin) and the audit entry this
// backs, both of which must run before this is ever called.
export async function deleteById(
  id: ObjectId,
  session?: import("mongodb").ClientSession,
): Promise<void> {
  await (await collection()).deleteOne({ _id: id }, { session });
}
