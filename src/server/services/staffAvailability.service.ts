import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import * as usersRepo from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import * as assignmentsRepo from "@/server/repositories/serviceAssignments.repo";
import * as handoversRepo from "@/server/repositories/assignmentHandovers.repo";
import * as auditLog from "@/server/repositories/auditLog.repo";
import type { StaffAvailability } from "@/shared/types/user";

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name ?? user.email;
}

// "available" is the only state that means "can keep operating active
// assignments" — every other value is a continuity trigger (Phase 1 audit
// §11: the current codebase gave no explicit ruling on which of the four
// requested states should behave differently from the others, so all
// three non-available states are treated identically here; splitting them
// apart — e.g. a grace period for on_leave but not departed — is a
// product decision to make explicitly later, not one to guess at now).
function blocksContinuedWork(availability: StaffAvailability): boolean {
  return availability !== "available";
}

// The write-side core, shared by two trigger paths: an explicit
// availability change (setStaffAvailability below) and blocking a staff
// account (adminUsers.service.ts's setUserStatus). Both must cascade to
// assignments the same way — this was a real gap found while testing:
// blocking a staff member with active assignments used to leave those
// assignments silently "active" with no owner able to touch them, exactly
// the risk the business requirement calls out. Takes an already-open
// session; the caller owns the transaction boundary so a status write and
// an availability write can share one atomic commit (Phase 1 §20).
export async function cascadeAvailabilityChange(
  target: UserDoc,
  actor: UserDoc,
  availability: StaffAvailability,
  reason: string | null,
  session: ClientSession,
): Promise<ObjectId[]> {
  await usersRepo.setAvailability(target._id, availability, session);

  if (blocksContinuedWork(availability)) {
    const active = await assignmentsRepo.findActiveByStaff(target._id, session);
    const ids = active.map((a) => a._id);
    if (active.length > 0) {
      await assignmentsRepo.markHandoverRequired(ids, reason, session);
      await handoversRepo.createPending(
        active.map((a) => ({
          assignmentId: a._id,
          onboardingId: a.onboardingId,
          serviceId: a.serviceId,
          fromStaffUserId: a.staffUserId,
          reason,
          initiatedByUserId: actor._id,
        })),
        session,
      );
    }
    return ids;
  }

  // Becoming available again: only ever pulls back assignments still
  // sitting at handover_required with no replacement chosen — see
  // serviceAssignments.repo.ts's revertToActive for why
  // handover_in_progress/transferred are untouched here.
  const pending = await assignmentsRepo.findHandoverRequiredByStaff(target._id, session);
  const ids = pending.map((a) => a._id);
  if (pending.length > 0) {
    await assignmentsRepo.revertToActive(ids, session);
    await handoversRepo.cancelPendingForAssignments(ids, session);
  }
  return ids;
}

// The two audit entries any availability cascade produces, regardless of
// which trigger caused it — factored out so adminUsers.service.ts's block
// path records the exact same shape of entry a direct availability change
// does, rather than a bespoke one.
export async function recordAvailabilityCascadeAudit(
  target: UserDoc,
  actor: UserDoc,
  fromAvailability: StaffAvailability,
  toAvailability: StaffAvailability,
  reason: string | null,
  affectedAssignmentIds: ObjectId[],
): Promise<void> {
  await auditLog.record({
    action: "staff_availability_changed",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: displayName(target),
    targetEmail: target.email,
    targetRole: target.role,
    metadata: {
      fromAvailability,
      toAvailability,
      reason: reason ?? undefined,
      affectedAssignmentCount: affectedAssignmentIds.length,
    },
  });

  if (affectedAssignmentIds.length === 0) return;

  await auditLog.record({
    action: blocksContinuedWork(toAvailability) ? "assignments_marked_for_handover" : "handover_cancelled",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: target._id,
    targetName: displayName(target),
    targetEmail: target.email,
    targetRole: target.role,
    metadata: { assignmentIds: affectedAssignmentIds.map((id) => id.toHexString()) },
  });
}

export type SetStaffAvailabilityResult =
  | { ok: true; affectedAssignmentIds: string[] }
  | { ok: false; errors: string[] };

// The direct admin action ("Manage Availability" in User Management).
// Always inside a transaction (Phase 1 §20/§21) so "availability flipped"
// and "affected assignments resolved" can never be observed half-done:
// either both land, or the whole change is rolled back and the caller
// gets a clear error instead of a false success (Phase 1 §21).
export async function setStaffAvailability(
  targetId: string,
  actor: UserDoc,
  availability: StaffAvailability,
  reason: string | null,
): Promise<SetStaffAvailabilityResult> {
  if (!ObjectId.isValid(targetId)) return { ok: false, errors: ["Staff member not found."] };

  const target = await usersRepo.findById(targetId);
  if (!target) return { ok: false, errors: ["Staff member not found."] };
  if (target.role !== "staff") {
    return { ok: false, errors: ["Availability only applies to staff accounts."] };
  }

  const current = target.availability ?? "available";
  if (current === availability) return { ok: true, affectedAssignmentIds: [] };

  const client = await getMongoClient();
  const session = client.startSession();
  let affectedAssignmentIds: ObjectId[] = [];

  try {
    await session.withTransaction(async () => {
      affectedAssignmentIds = await cascadeAvailabilityChange(target, actor, availability, reason, session);
    });
  } finally {
    await session.endSession();
  }

  await recordAvailabilityCascadeAudit(target, actor, current, availability, reason, affectedAssignmentIds);

  return { ok: true, affectedAssignmentIds: affectedAssignmentIds.map((id) => id.toHexString()) };
}
