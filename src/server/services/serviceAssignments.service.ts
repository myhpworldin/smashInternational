import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import * as assignmentsRepo from "@/server/repositories/serviceAssignments.repo";
import type { ServiceAssignmentDoc } from "@/server/repositories/serviceAssignments.repo";
import * as handoversRepo from "@/server/repositories/assignmentHandovers.repo";
import * as onboardingRepo from "@/server/repositories/onboarding.repo";
import * as usersRepo from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import * as auditLog from "@/server/repositories/auditLog.repo";
import * as notificationsRepo from "@/server/repositories/notifications.repo";
import { getServiceById } from "@/shared/config/services";
import {
  ACCOUNT_MANAGER_SLOT,
  isAccountManagerSlot,
  type ServiceAssignmentRow,
  type StaffAssignmentRow,
  type StaffHandoverQueueRow,
} from "@/shared/types/serviceAssignment";

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name ?? user.email;
}

// The one place a serviceId becomes its display label — every call site
// that used to inline `getServiceById(id)?.label ?? id` now goes through
// here so the account-manager slot resolves the same way everywhere
// instead of leaking its raw sentinel string into any UI.
function resolveServiceLabel(serviceId: string): string {
  if (isAccountManagerSlot(serviceId)) return "Account Manager";
  return getServiceById(serviceId)?.label ?? serviceId;
}

export type CreateAssignmentResult = { ok: true; id: string } | { ok: false; errors: string[] };

// Deliberately minimal — this is the "someone has to be able to create an
// assignment at all" prerequisite the Phase 1/2 audit found missing, not
// the Phase 3 reassignment workflow. One assignment per onboarding+service
// at a time; reassigning an already-owned or handover_required slot goes
// through transferAssignment below.
export async function createAssignment(
  input: { onboardingId: string; serviceId: string; staffUserId: string },
  actor: UserDoc,
): Promise<CreateAssignmentResult> {
  if (!ObjectId.isValid(input.onboardingId) || !ObjectId.isValid(input.staffUserId)) {
    return { ok: false, errors: ["Invalid onboarding or staff reference."] };
  }

  const onboardingId = new ObjectId(input.onboardingId);
  const onboarding = await onboardingRepo.findById(onboardingId);
  if (!onboarding) return { ok: false, errors: ["Onboarding record not found."] };

  // The account-manager slot is a client-wide relationship-owner
  // assignment, not tied to any one selected service — skip the
  // catalog/selected-service checks that only make sense for a real
  // service assignment.
  if (!isAccountManagerSlot(input.serviceId)) {
    if (!getServiceById(input.serviceId)) {
      return { ok: false, errors: ["Unknown service."] };
    }
    if (!onboarding.selectedServiceIds.includes(input.serviceId)) {
      return { ok: false, errors: ["This client didn't select that service."] };
    }
  }

  const staff = await usersRepo.findById(input.staffUserId);
  if (!staff || staff.role !== "staff") {
    return { ok: false, errors: ["Not a staff account."] };
  }
  if (staff.status === "blocked") {
    return { ok: false, errors: ["This staff member is blocked."] };
  }
  if ((staff.availability ?? "available") !== "available") {
    return { ok: false, errors: ["This staff member isn't currently available for new assignments."] };
  }

  const existing = await assignmentsRepo.findLiveByOnboardingAndService(onboardingId, input.serviceId);
  if (existing) {
    return { ok: false, errors: ["This service already has an active assignment. Reassign it instead."] };
  }

  const created = await assignmentsRepo.create({
    onboardingId,
    clientId: onboarding.clientId,
    serviceId: input.serviceId,
    staffUserId: staff._id,
    assignedByUserId: actor._id,
  });

  await auditLog.record({
    action: "service_assignment_created",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: staff._id,
    targetName: displayName(staff),
    targetEmail: staff.email,
    targetRole: staff.role,
    metadata: { onboardingId: input.onboardingId, serviceId: input.serviceId },
  });

  return { ok: true, id: created._id.toHexString() };
}

// Shared row-builder behind both listAssignmentsForOnboarding (one
// client's services) and listHandoverRequiredForStaff (one departing
// staff member's affected work across every client) — same staff/service
// resolution, same eligible-count and history computation, so the two
// admin views can never quietly disagree about what a row means.
async function buildAssignmentRows(docs: ServiceAssignmentDoc[]): Promise<ServiceAssignmentRow[]> {
  if (docs.length === 0) return [];

  const staffIds = [...new Set(docs.map((d) => d.staffUserId.toHexString()))];
  const staffDocs = await Promise.all(staffIds.map((id) => usersRepo.findById(id)));
  const staffById = new Map(staffDocs.filter((d) => d !== null).map((d) => [d._id.toHexString(), d]));

  const eligibleCounts = new Map<string, number>();
  for (const doc of docs) {
    if (doc.status !== "handover_required") continue;
    const key = doc.staffUserId.toHexString();
    if (!eligibleCounts.has(key)) {
      eligibleCounts.set(key, await usersRepo.countEligibleStaff(doc.staffUserId));
    }
  }

  return Promise.all(
    docs.map(async (doc) => {
      const staff = staffById.get(doc.staffUserId.toHexString());
      const completed = await handoversRepo.listCompletedByAssignment(doc._id);
      const history = await Promise.all(
        completed.map(async (h) => {
          const [fromStaff, toStaff] = await Promise.all([
            usersRepo.findById(h.fromStaffUserId.toHexString()),
            h.toStaffUserId ? usersRepo.findById(h.toStaffUserId.toHexString()) : null,
          ]);
          return {
            fromStaffName: fromStaff ? displayName(fromStaff) : "(former staff member)",
            toStaffName: toStaff ? displayName(toStaff) : "(former staff member)",
            completedAt: (h.completedAt ?? h.initiatedAt).toISOString(),
            reason: h.reason,
          };
        }),
      );

      return {
        id: doc._id.toHexString(),
        onboardingId: doc.onboardingId.toHexString(),
        serviceId: doc.serviceId,
        serviceLabel: resolveServiceLabel(doc.serviceId),
        status: doc.status,
        staffUserId: doc.staffUserId.toHexString(),
        staffName: staff ? displayName(staff) : "(former staff member)",
        staffEmail: staff?.email ?? "",
        assignedAt: doc.assignedAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        handoverReason: doc.handoverReason,
        handoverRequiredAt: doc.handoverRequiredAt?.toISOString() ?? null,
        eligibleReplacementCount:
          doc.status === "handover_required" ? (eligibleCounts.get(doc.staffUserId.toHexString()) ?? 0) : null,
        handoverHistory: history,
      };
    }),
  );
}

// Admin-facing list for one onboarding's Onboarding Detail page.
export async function listAssignmentsForOnboarding(onboardingId: string): Promise<ServiceAssignmentRow[]> {
  if (!ObjectId.isValid(onboardingId)) return [];
  const docs = await assignmentsRepo.listByOnboarding(new ObjectId(onboardingId));
  return buildAssignmentRows(docs);
}

// The bulk handover queue (Phase 3 §6/§9) — every one of one staff
// member's assignments currently awaiting handover, resolved with client
// company names so an admin can review and transfer all of them from one
// screen instead of hunting through each onboarding separately.
export async function listHandoverRequiredForStaff(staffUserId: string): Promise<StaffHandoverQueueRow[]> {
  if (!ObjectId.isValid(staffUserId)) return [];
  const docs = await assignmentsRepo.findHandoverRequiredByStaff(new ObjectId(staffUserId));
  const rows = await buildAssignmentRows(docs);

  const onboardingIds = [...new Set(docs.map((d) => d.onboardingId.toHexString()))];
  const onboardingDocs = await Promise.all(onboardingIds.map((id) => onboardingRepo.findById(new ObjectId(id))));
  const companyNameById = new Map(
    onboardingDocs
      .filter((d) => d !== null)
      .map((d) => [d._id.toHexString(), (d.company as { name?: string } | null)?.name ?? "(company name not set)"]),
  );

  return rows.map((row) => ({
    ...row,
    clientCompanyName: companyNameById.get(row.onboardingId) ?? "(company name not set)",
  }));
}

export type TransferAssignmentResult = { ok: true } | { ok: false; errors: string[] };

// The actual handover execution (Phase 3 §2/§12/§13/§17/§18): moves one
// assignment from its departed staff member to a validated replacement,
// atomically, and records the transition as permanent history rather than
// overwriting it. Both the assignment write and the handover-record write
// are conditioned on the state the caller expects (still
// handover_required / still pending) so a concurrent second transfer, or
// a stale admin screen re-submitting, fails cleanly instead of silently
// clobbering newer state or double-transferring.
export async function transferAssignment(
  assignmentId: string,
  input: { staffUserId: string; reason: string | null },
  actor: UserDoc,
): Promise<TransferAssignmentResult> {
  if (!ObjectId.isValid(assignmentId) || !ObjectId.isValid(input.staffUserId)) {
    return { ok: false, errors: ["Invalid assignment or staff reference."] };
  }

  const assignment = await assignmentsRepo.findById(new ObjectId(assignmentId));
  if (!assignment) return { ok: false, errors: ["Assignment not found."] };
  if (assignment.status !== "handover_required") {
    return { ok: false, errors: ["This assignment isn't awaiting handover — it may have already been transferred."] };
  }

  if (input.staffUserId === assignment.staffUserId.toHexString()) {
    return { ok: false, errors: ["Select a different staff member to transfer to."] };
  }

  const replacement = await usersRepo.findById(input.staffUserId);
  if (!replacement || replacement.role !== "staff") {
    return { ok: false, errors: ["Not a staff account."] };
  }
  if (replacement.status === "blocked") {
    return { ok: false, errors: ["This staff member is blocked and can't receive new assignments."] };
  }
  if ((replacement.availability ?? "available") !== "available") {
    return { ok: false, errors: ["This staff member isn't currently available for new assignments."] };
  }

  const previousStaff = await usersRepo.findById(assignment.staffUserId.toHexString());
  const onboarding = await onboardingRepo.findById(assignment.onboardingId);
  const companyName = (onboarding?.company as { name?: string } | null)?.name ?? "this client";
  const serviceLabel = resolveServiceLabel(assignment.serviceId);

  const client = await getMongoClient();
  const session = client.startSession();
  let conflict = false;

  try {
    await session.withTransaction(async () => {
      const updated = await assignmentsRepo.transferOwnership(assignment._id, replacement._id, session);
      if (!updated) {
        conflict = true;
        throw new Error("ASSIGNMENT_CONFLICT");
      }

      const pending = await handoversRepo.findPendingByAssignment(assignment._id, session);
      if (pending) {
        const completed = await handoversRepo.completePending(pending._id, replacement._id, session);
        if (!completed) {
          conflict = true;
          throw new Error("HANDOVER_CONFLICT");
        }
      } else {
        // No pending record to close out (see createCompleted's own
        // comment) — write the transition directly so history stays
        // accurate regardless of how this assignment reached
        // handover_required.
        await handoversRepo.createCompleted(
          {
            assignmentId: assignment._id,
            onboardingId: assignment.onboardingId,
            serviceId: assignment.serviceId,
            fromStaffUserId: assignment.staffUserId,
            toStaffUserId: replacement._id,
            reason: input.reason,
            initiatedByUserId: actor._id,
          },
          session,
        );
      }

      // Written on the same one-time-success path as the writes above
      // (Phase 4 §5/§12) — see notifications.repo.ts's create() for why
      // that structurally rules out a duplicate from a retry/double-click.
      await notificationsRepo.create(
        {
          recipientUserId: replacement._id,
          type: "service_assignment_transferred",
          title: "New Service Assignment",
          message: `${serviceLabel} for ${companyName} has been assigned to you.`,
          assignmentId: assignment._id,
          onboardingId: assignment.onboardingId,
          serviceId: assignment.serviceId,
        },
        session,
      );
    });
  } catch (err) {
    if (!conflict) throw err;
  } finally {
    await session.endSession();
  }

  if (conflict) {
    return {
      ok: false,
      errors: ["This assignment was just changed by someone else. Refresh and try again."],
    };
  }

  await auditLog.record({
    action: "service_handover_completed",
    actorUserId: actor._id,
    actorName: displayName(actor),
    actorEmail: actor.email,
    targetUserId: replacement._id,
    targetName: displayName(replacement),
    targetEmail: replacement.email,
    targetRole: replacement.role,
    metadata: {
      onboardingId: assignment.onboardingId.toHexString(),
      serviceId: assignment.serviceId,
      previousStaffUserId: assignment.staffUserId.toHexString(),
      previousStaffName: previousStaff ? displayName(previousStaff) : "(former staff member)",
      reason: input.reason ?? undefined,
    },
  });

  return { ok: true };
}

// Staff-facing "my assignments" — active only (Phase 1 audit §6/§10): the
// moment an assignment moves to handover_required it drops off this list
// server-side, not just visually. After a successful transfer the
// previous staff member's next request here simply won't include it
// (staffUserId no longer matches), and the new staff member's next
// request will (Phase 3 §17/§18) — no separate access-revocation step
// needed beyond the assignment write itself.
export async function listActiveAssignmentsForStaff(staffUserId: string): Promise<StaffAssignmentRow[]> {
  if (!ObjectId.isValid(staffUserId)) return [];

  const docs = await assignmentsRepo.listActiveByStaff(new ObjectId(staffUserId));
  if (docs.length === 0) return [];

  const onboardingIds = [...new Set(docs.map((d) => d.onboardingId.toHexString()))];
  const onboardingDocs = await Promise.all(onboardingIds.map((id) => onboardingRepo.findById(new ObjectId(id))));
  const onboardingById = new Map(onboardingDocs.filter((d) => d !== null).map((d) => [d._id.toHexString(), d]));

  return docs.map((doc) => {
    const onboarding = onboardingById.get(doc.onboardingId.toHexString());
    const company = onboarding?.company as { name?: string } | null | undefined;
    return {
      id: doc._id.toHexString(),
      serviceId: doc.serviceId,
      serviceLabel: resolveServiceLabel(doc.serviceId),
      clientCompanyName: company?.name ?? "(company name not set)",
      status: doc.status,
      assignedAt: doc.assignedAt.toISOString(),
    };
  });
}

// Stage 1 Phase 28 §18 — the ONE thing about assignment this codebase
// exposes to a client at all, and deliberately just this: a display
// name, nothing else. Never the staff member's email, never their
// availability/blocked status, never whether a handover is in progress,
// never who held the role before ("Rahul resigned," "handover failed")
// — exactly the internal churn detail §18 says a client must never see.
// `null` (not an empty string) when no account manager is currently
// assigned, so the caller can render an honest "not yet assigned" state
// instead of an empty label.
export async function getAccountManagerNameForClient(clientId: ObjectId): Promise<string | null> {
  const assignment = await assignmentsRepo.findLiveByClientAndService(clientId, ACCOUNT_MANAGER_SLOT);
  if (!assignment || assignment.status !== "active") return null;
  const staff = await usersRepo.findById(assignment.staffUserId.toHexString());
  return staff ? displayName(staff) : null;
}
