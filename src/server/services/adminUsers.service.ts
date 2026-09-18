import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import * as usersRepo from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import * as auditLog from "@/server/repositories/auditLog.repo";
import { hashPassword } from "@/server/auth/password";
import { generateTempPassword } from "@/server/auth/tempPassword";
import { cascadeAvailabilityChange, recordAvailabilityCascadeAudit } from "@/server/services/staffAvailability.service";
import type { Role } from "@/shared/types/user";
import type { AdminUserRow, AdminUserStatus } from "@/shared/types/adminUser";

// Falls back to email when name isn't set (legacy pre-Phase-3 accounts,
// or — in principle — an admin doc predating the name field entirely) so
// an audit entry's actor/target is never blank.
function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name ?? user.email;
}

export type CreateUserByAdminInput = {
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AdminUserStatus;
};

export type CreatedAdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AdminUserStatus;
  mustChangePassword: true;
  createdAt: Date;
};

export type CreateUserByAdminResult =
  | { ok: true; user: CreatedAdminUser; temporaryPassword: string }
  | { ok: false; errors: string[] };

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

// Admin-created accounts never go through public signup/OTP (that path is
// untouched by this function) — the admin is directly vouching for the
// email, so the account is marked emailVerified immediately, but
// mustChangePassword still gates real use: the temporary password only
// gets the user through their first login. It's generated and hashed
// here and returned exactly once to the caller — nothing about it is
// persisted anywhere in plaintext, and there is no code path anywhere in
// this app that reads passwordHash back out as a password. `actor` is
// the full admin UserDoc (not just an id) so the audit entry below can
// snapshot a name/email without a second DB read.
export async function createUserByAdmin(
  input: CreateUserByAdminInput,
  actor: UserDoc,
): Promise<CreateUserByAdminResult> {
  try {
    const existing = await usersRepo.findByEmail(input.email);
    if (existing) {
      return { ok: false, errors: ["A user with this email already exists."] };
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await usersRepo.createByAdmin({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      status: input.status,
      passwordHash,
      createdBy: actor._id,
    });

    await auditLog.record({
      action: "user_created",
      actorUserId: actor._id,
      actorName: displayName(actor),
      actorEmail: actor.email,
      targetUserId: user._id,
      targetName: displayName(user),
      targetEmail: user.email,
      targetRole: user.role,
      metadata: { role: user.role, status: input.status },
    });

    return {
      ok: true,
      user: {
        id: user._id.toHexString(),
        name: input.name,
        email: user.email,
        phone: input.phone,
        role: user.role,
        status: input.status,
        mustChangePassword: true,
        createdAt: user.createdAt,
      },
      temporaryPassword,
    };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { ok: false, errors: ["A user with this email already exists."] };
    }
    // A transient DB error (stale pooled connection, brief server-selection
    // delay) must still resolve to a typed result — rethrowing here would
    // leave the API route with an unhandled rejection and no JSON body,
    // which the client can only see as the Create button silently hanging.
    console.error("createUserByAdmin failed:", err);
    return { ok: false, errors: ["Couldn't create this user right now. Try again."] };
  }
}

function toAdminUserRow(doc: UserDoc): AdminUserRow {
  return {
    id: doc._id.toHexString(),
    name: doc.name ?? "(name not set)",
    email: doc.email,
    phone: doc.phone ?? null,
    role: doc.role,
    status: doc.status ?? "active",
    availability: doc.role === "staff" ? doc.availability ?? "available" : undefined,
    emailVerified: doc.emailVerified ?? false,
    mustChangePassword: doc.mustChangePassword ?? false,
    createdAt: doc.createdAt,
    // Login-time tracking doesn't exist yet (Phase 1 audit) — reporting
    // "Never" for everyone is honest about that, rather than fabricating
    // a value.
    lastLoginAt: null,
  };
}

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const docs = await usersRepo.listAll();
  return docs.map(toAdminUserRow);
}

export async function getAdminUserById(id: string): Promise<AdminUserRow | null> {
  const doc = await usersRepo.findById(id);
  return doc ? toAdminUserRow(doc) : null;
}

export type AssignableStaffOption = { id: string; name: string; email: string };

// Staff currently eligible to receive a *new* assignment — feeds the
// "Assign staff" control on Onboarding Detail (see
// serviceAssignments.service.ts's createAssignment for the same
// eligibility rule enforced server-side, not just reflected here).
export async function listAssignableStaffForAdmin(): Promise<AssignableStaffOption[]> {
  const docs = await usersRepo.listAssignableStaff();
  return docs.map((doc) => ({ id: doc._id.toHexString(), name: doc.name ?? doc.email, email: doc.email }));
}

export type MutationResult = { ok: true } | { ok: false; errors: string[] };

// name/phone/email only — role, status, and password each require their
// own function below, so a generic edit endpoint can never reach them.
export async function updateUserProfile(
  targetId: string,
  actor: UserDoc,
  updates: { name?: string; phone?: string; email?: string },
): Promise<MutationResult> {
  if (!ObjectId.isValid(targetId)) return { ok: false, errors: ["User not found."] };
  if (updates.name === undefined && updates.email === undefined && updates.phone === undefined) {
    return { ok: false, errors: ["Nothing to update."] };
  }

  const target = await usersRepo.findById(targetId);
  if (!target) return { ok: false, errors: ["User not found."] };

  if (updates.email && updates.email !== target.email) {
    const existing = await usersRepo.findByEmail(updates.email);
    if (existing) return { ok: false, errors: ["A user with this email already exists."] };
  }

  const repoUpdates: { name?: string; phone?: string | null; email?: string } = {};
  if (updates.name !== undefined) repoUpdates.name = updates.name;
  if (updates.phone !== undefined) repoUpdates.phone = updates.phone;
  if (updates.email !== undefined) repoUpdates.email = updates.email;

  await usersRepo.updateProfile(target._id, repoUpdates);
  await auditLog.record({
    action: "user_updated",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: repoUpdates.name ?? displayName(target),
    targetEmail: repoUpdates.email ?? target.email,
    targetRole: target.role,
    metadata: { fields: Object.keys(repoUpdates) },
  });

  return { ok: true };
}

// Server is the only source of truth for the new role — never trusts a
// role value beyond what changeUserRoleSchema already constrained it to
// (admin/client, nothing else). Refuses to change the role of the
// organization's last remaining admin so a role edit can never lock
// every admin out.
export async function updateUserRole(
  targetId: string,
  actor: UserDoc,
  role: Role,
): Promise<MutationResult> {
  if (!ObjectId.isValid(targetId)) return { ok: false, errors: ["User not found."] };

  const target = await usersRepo.findById(targetId);
  if (!target) return { ok: false, errors: ["User not found."] };
  if (target.role === role) return { ok: true };

  if (target.role === "admin" && role !== "admin") {
    const activeAdmins = await usersRepo.countActiveAdmins();
    if (activeAdmins <= 1) {
      return { ok: false, errors: ["Can't change the role of the last remaining admin."] };
    }
  }

  // A staff member moved to a different role can no longer hold active
  // work (getAuthorizedStaff/requireRole("staff") both gate on the live
  // role, so they'd lose API/dashboard access to it immediately) — but
  // until Phase 6 QA, nothing told the *assignment* that had happened.
  // Found during Phase 6 QA (§21): the assignment stayed "active" with a
  // staffUserId pointing at a now-non-staff account — invisible to the
  // ex-staff member (access correctly denied) and invisible to the
  // handover dashboard (which only ever looks at role:"staff" users),
  // i.e. silently orphaned with no one able to see or recover it. Cascade
  // the same way blocking a staff member does (setUserStatus below),
  // atomically with the role write, so the work surfaces as
  // handover_required instead of disappearing.
  const shouldCascadeAwayFromStaff =
    target.role === "staff" && role !== "staff" && (target.availability ?? "available") === "available";
  let affectedAssignmentIds: ObjectId[] = [];

  if (shouldCascadeAwayFromStaff) {
    const client = await getMongoClient();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await usersRepo.updateRole(target._id, role, session);
        affectedAssignmentIds = await cascadeAvailabilityChange(target, actor, "unavailable", null, session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    await usersRepo.updateRole(target._id, role);
  }

  await auditLog.record({
    action: "role_changed",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: displayName(target),
    targetEmail: target.email,
    targetRole: role,
    metadata: { fromRole: target.role, toRole: role },
  });

  if (shouldCascadeAwayFromStaff) {
    await recordAvailabilityCascadeAudit(target, actor, "available", "unavailable", null, affectedAssignmentIds);
  }

  return { ok: true };
}

// Blocking bumps sessionVersion in the same repo call, which is what
// actually forces any session the user is already holding to
// re-authenticate (see verifySession in dal.ts) — status alone wouldn't,
// since a stateless JWT carries no live link back to the DB otherwise.
// Unblocking deliberately touches nothing else: no automatic role change,
// no automatic password reset (Phase 4 spec, §5).
export async function setUserStatus(
  targetId: string,
  actor: UserDoc,
  status: AdminUserStatus,
): Promise<MutationResult> {
  if (!ObjectId.isValid(targetId)) return { ok: false, errors: ["User not found."] };
  if (status === "blocked" && targetId === actor._id.toHexString()) {
    return { ok: false, errors: ["You can't block your own account."] };
  }

  const target = await usersRepo.findById(targetId);
  if (!target) return { ok: false, errors: ["User not found."] };

  const currentStatus = target.status ?? "active";
  if (currentStatus === status) return { ok: true };

  if (status === "blocked" && target.role === "admin") {
    const activeAdmins = await usersRepo.countActiveAdmins();
    if (activeAdmins <= 1) {
      return { ok: false, errors: ["Can't block the organization's only active admin."] };
    }
  }

  // Blocking a staff member must never leave their active assignments
  // silently ownerless (Phase 1 audit §8 / Phase 2 primary requirement) —
  // caught during testing: without this, an assignment stayed "active"
  // with no staff able to touch it. Cascades the same way an explicit
  // availability change does (staffAvailability.service.ts), in the same
  // transaction as the status write, and only when they were actually
  // "available" (a staff member already on_leave/unavailable/departed has
  // already had their assignments dealt with — this must never re-trigger
  // or clobber an in-progress Phase 3 handover). Unblocking deliberately
  // does the reverse of nothing: account status and work availability are
  // separate axes (Phase 1 §3) — restoring assignments after unblock is a
  // distinct admin decision made through the availability action, not an
  // automatic side effect of unblocking.
  const shouldCascadeToUnavailable =
    status === "blocked" && target.role === "staff" && (target.availability ?? "available") === "available";
  let affectedAssignmentIds: ObjectId[] = [];

  if (status === "blocked") {
    const nextSessionVersion = (target.sessionVersion ?? 1) + 1;
    if (shouldCascadeToUnavailable) {
      const client = await getMongoClient();
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          await usersRepo.setStatus(target._id, status, nextSessionVersion, session);
          affectedAssignmentIds = await cascadeAvailabilityChange(target, actor, "unavailable", null, session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      await usersRepo.setStatus(target._id, status, nextSessionVersion);
    }
  } else {
    await usersRepo.setStatus(target._id, status);
  }

  await auditLog.record({
    action: status === "blocked" ? "user_blocked" : "user_unblocked",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: displayName(target),
    targetEmail: target.email,
    targetRole: target.role,
    metadata: { fromStatus: currentStatus, toStatus: status },
  });

  if (shouldCascadeToUnavailable) {
    await recordAvailabilityCascadeAudit(target, actor, "available", "unavailable", null, affectedAssignmentIds);
  }

  return { ok: true };
}

export type ResetPasswordResult =
  | { ok: true; temporaryPassword: string }
  | { ok: false; errors: string[] };

// Admin-initiated resets for someone else's account only — an admin
// resetting their own password must go through the normal self-service
// password change instead (Phase 4 spec, §7), not this endpoint, so it's
// refused outright here rather than silently doing the same thing. The
// new temporary password is generated fresh (never derived from the old
// one, which this code never reads — passwordHash is one-way), and
// sessionVersion is bumped in the same write so whatever session the
// user was already holding stops working immediately (§8). The audit
// entry never carries the password itself — only that a reset happened.
export async function resetUserPassword(
  targetId: string,
  actor: UserDoc,
): Promise<ResetPasswordResult> {
  if (!ObjectId.isValid(targetId)) return { ok: false, errors: ["User not found."] };
  if (targetId === actor._id.toHexString()) {
    return { ok: false, errors: ["Use your own account's password change, not this action, for your own password."] };
  }

  const target = await usersRepo.findById(targetId);
  if (!target) return { ok: false, errors: ["User not found."] };

  const temporaryPassword = generateTempPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const nextSessionVersion = (target.sessionVersion ?? 1) + 1;

  await usersRepo.resetPasswordByAdmin(target._id, passwordHash, nextSessionVersion);
  await auditLog.record({
    action: "password_reset_by_admin",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: displayName(target),
    targetEmail: target.email,
    targetRole: target.role,
    metadata: {},
  });

  return { ok: true, temporaryPassword };
}
