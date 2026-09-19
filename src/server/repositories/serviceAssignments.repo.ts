import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { AssignmentStatus } from "@/shared/types/serviceAssignment";

const COLLECTION = "serviceAssignments";

// One row = one service's current operational owner for one onboarding.
// History is never overwritten in place — see assignmentHandovers.repo.ts
// for the append-only log of who owned it before. Recommended indexes
// (created manually — this codebase doesn't create indexes in app code):
// { staffUserId: 1, status: 1 }, { onboardingId: 1 }.
export type ServiceAssignmentDoc = {
  _id: ObjectId;
  onboardingId: ObjectId;
  clientId: ObjectId;
  serviceId: string;
  staffUserId: ObjectId;
  status: AssignmentStatus;
  assignedByUserId: ObjectId;
  assignedAt: Date;
  updatedAt: Date;
  // Only meaningful while status === "handover_required" — cleared again
  // if the assignment reverts to active (staff became available again
  // before a replacement was chosen).
  handoverReason: string | null;
  handoverRequiredAt: Date | null;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ServiceAssignmentDoc>(COLLECTION);
}

export async function create(input: {
  onboardingId: ObjectId;
  clientId: ObjectId;
  serviceId: string;
  staffUserId: ObjectId;
  assignedByUserId: ObjectId;
}): Promise<ServiceAssignmentDoc> {
  const now = new Date();
  const doc: ServiceAssignmentDoc = {
    _id: new ObjectId(),
    onboardingId: input.onboardingId,
    clientId: input.clientId,
    serviceId: input.serviceId,
    staffUserId: input.staffUserId,
    status: "active",
    assignedByUserId: input.assignedByUserId,
    assignedAt: now,
    updatedAt: now,
    handoverReason: null,
    handoverRequiredAt: null,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

// Only a currently-live assignment (active, or already mid-continuity)
// blocks creating a new one for the same onboarding+service — a
// transferred/cancelled row is history, not an active claim on the slot.
export async function findLiveByOnboardingAndService(
  onboardingId: ObjectId,
  serviceId: string,
): Promise<ServiceAssignmentDoc | null> {
  return (await collection()).findOne({
    onboardingId,
    serviceId,
    status: { $in: ["active", "handover_required", "handover_in_progress"] },
  });
}

// Stage 1 Phase 28 — the account-manager slot is looked up by clientId
// directly (this doc's own denormalized field) rather than by
// onboardingId, since the client-safe reader (getAccountManagerForClient)
// only ever has a session-derived clientId on hand, not an onboardingId.
export async function findLiveByClientAndService(
  clientId: ObjectId,
  serviceId: string,
): Promise<ServiceAssignmentDoc | null> {
  return (await collection()).findOne({
    clientId,
    serviceId,
    status: { $in: ["active", "handover_required", "handover_in_progress"] },
  });
}

export async function listByOnboarding(onboardingId: ObjectId): Promise<ServiceAssignmentDoc[]> {
  return (await collection()).find({ onboardingId }).sort({ serviceId: 1 }).toArray();
}

// Scoped to exactly what a staff member should ever see of their own work
// (Phase 1 audit §6/§10) — active only, so an assignment that just moved
// to handover_required disappears from their list the same request the
// status change lands.
export async function listActiveByStaff(staffUserId: ObjectId): Promise<ServiceAssignmentDoc[]> {
  return (await collection()).find({ staffUserId, status: "active" }).sort({ updatedAt: -1 }).toArray();
}

export async function findActiveByStaff(
  staffUserId: ObjectId,
  session?: ClientSession,
): Promise<ServiceAssignmentDoc[]> {
  return (await collection()).find({ staffUserId, status: "active" }, { session }).toArray();
}

// Flips a specific set of assignments (already fetched by the caller
// inside the same transaction) from active to handover_required in one
// write — never a blanket "every assignment this staff has," always the
// exact ids just identified as active.
export async function markHandoverRequired(
  ids: ObjectId[],
  reason: string | null,
  session?: ClientSession,
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date();
  await (await collection()).updateMany(
    { _id: { $in: ids }, status: "active" },
    { $set: { status: "handover_required", handoverReason: reason, handoverRequiredAt: now, updatedAt: now } },
    { session },
  );
}

// The staff-becomes-available-again path (Phase 1 §12 / test scenario 6):
// only ever reverts assignments still sitting at handover_required with no
// replacement chosen yet — one already at handover_in_progress or
// transferred is Phase 3's problem, not silently undone here.
// Org-wide, for the handover dashboard's summary tiles (Phase 5 §4) —
// distinct affected services/clients are derived from this in
// handoverOverview.service.ts rather than a separate aggregation query.
export async function findAllHandoverRequired(): Promise<ServiceAssignmentDoc[]> {
  return (await collection()).find({ status: "handover_required" }).toArray();
}

// Stage 1 Phase 28 §29/§30 — every assignment currently occupying a slot
// (same "live" status set findLiveByOnboardingAndService already uses),
// org-wide — lets the admin dashboard find engagements with NO occupying
// assignment at all, not just ones stuck mid-handover.
export async function findAllLive(): Promise<ServiceAssignmentDoc[]> {
  return (await collection())
    .find({ status: { $in: ["active", "handover_required", "handover_in_progress"] } })
    .toArray();
}

export async function findHandoverRequiredByStaff(
  staffUserId: ObjectId,
  session?: ClientSession,
): Promise<ServiceAssignmentDoc[]> {
  return (await collection()).find({ staffUserId, status: "handover_required" }, { session }).toArray();
}

export async function revertToActive(ids: ObjectId[], session?: ClientSession): Promise<void> {
  if (ids.length === 0) return;
  await (await collection()).updateMany(
    { _id: { $in: ids }, status: "handover_required" },
    { $set: { status: "active", handoverReason: null, handoverRequiredAt: null, updatedAt: new Date() } },
    { session },
  );
}

export async function findById(id: ObjectId): Promise<ServiceAssignmentDoc | null> {
  return (await collection()).findOne({ _id: id });
}

// The handover execution write. Conditioned on the assignment still being
// exactly handover_required (Phase 3 §12/§13/§24) — this is the
// concurrency guard: if a second admin's request (or a stale screen)
// tries to transfer an assignment that's already been transferred or
// reverted, this matches zero documents and the caller treats that as a
// conflict rather than silently overwriting newer state. Returns the
// updated document only on an actual match.
export async function transferOwnership(
  assignmentId: ObjectId,
  newStaffUserId: ObjectId,
  session: ClientSession,
): Promise<ServiceAssignmentDoc | null> {
  const result = await (await collection()).findOneAndUpdate(
    { _id: assignmentId, status: "handover_required" },
    {
      $set: {
        staffUserId: newStaffUserId,
        status: "active",
        handoverReason: null,
        handoverRequiredAt: null,
        updatedAt: new Date(),
      },
    },
    { session, returnDocument: "after" },
  );
  return result ?? null;
}
