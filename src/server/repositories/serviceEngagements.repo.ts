import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ServiceEngagementStatus } from "@/shared/types/serviceEngagement";
import { LIVE_SERVICE_ENGAGEMENT_STATUSES } from "@/shared/types/serviceEngagement";

const COLLECTION = "serviceEngagements";

// One row = one service SMASH actually provides to one client, independent
// of any other service that same client has. See
// shared/types/serviceEngagement.ts for why this is a separate concept
// from both the onboarding submission (a point-in-time request) and
// ServiceAssignment (who on staff currently operates it — a different
// collection entirely, unrelated to this one at the schema level; a future
// phase may add an engagementId reference onto ServiceAssignment, but nothing
// here requires that yet). Recommended indexes (created manually — this
// codebase doesn't create indexes in app code, see
// serviceAssignments.repo.ts for the same convention):
// { clientId: 1, serviceId: 1 }, { sourceOnboardingId: 1 }, { status: 1 }.
export type ServiceEngagementDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceId: string;
  // Traceability back to the onboarding submission that originally
  // requested this service (Phase 3 §15) — never rewritten after creation.
  sourceOnboardingId: ObjectId;
  status: ServiceEngagementStatus;
  requestedAt: Date;
  approvedAt: Date | null;
  activatedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ServiceEngagementDoc>(COLLECTION);
}

// The idempotency guard (Phase 3 §12/§13): only a live engagement occupies
// the (clientId, serviceId) slot, so a retried approval that re-runs
// createForOnboardingApproval can see one already exists and skip it,
// while a client whose prior engagement for this exact service was later
// completed/cancelled is free to have it requested again.
export async function findLiveByClientAndService(
  clientId: ObjectId,
  serviceId: string,
): Promise<ServiceEngagementDoc | null> {
  return (await collection()).findOne({
    clientId,
    serviceId,
    status: { $in: [...LIVE_SERVICE_ENGAGEMENT_STATUSES] },
  });
}

export async function create(input: {
  clientId: ObjectId;
  serviceId: string;
  sourceOnboardingId: ObjectId;
  status: ServiceEngagementStatus;
}): Promise<ServiceEngagementDoc> {
  const now = new Date();
  const doc: ServiceEngagementDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    serviceId: input.serviceId,
    sourceOnboardingId: input.sourceOnboardingId,
    status: input.status,
    requestedAt: now,
    approvedAt: input.status === "approved" ? now : null,
    activatedAt: null,
    pausedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function listByClientId(clientId: ObjectId): Promise<ServiceEngagementDoc[]> {
  return (await collection()).find({ clientId }).sort({ createdAt: 1 }).toArray();
}

// Stage 1 Phase 28 §29/§30 — org-wide, for the admin handover dashboard's
// "unassigned active services" tile: every currently-live engagement
// across every client, cross-referenced there against
// serviceAssignments.repo.ts's own findAllLive to find engagements with
// no occupying assignment at all.
export async function listAllLive(): Promise<ServiceEngagementDoc[]> {
  return (await collection()).find({ status: { $in: [...LIVE_SERVICE_ENGAGEMENT_STATUSES] } }).toArray();
}

export async function listBySourceOnboardingId(onboardingId: ObjectId): Promise<ServiceEngagementDoc[]> {
  return (await collection()).find({ sourceOnboardingId: onboardingId }).toArray();
}

export async function findById(id: ObjectId): Promise<ServiceEngagementDoc | null> {
  return (await collection()).findOne({ _id: id });
}

// Conditioned on the engagement still being exactly at `fromStatus`
// (Phase 4's concurrency guard, mirroring serviceAssignments.repo.ts's
// transferOwnership) — a concurrent second admin action between the
// caller's read and this write matches zero documents rather than
// silently overwriting a status this call never actually observed.
export async function updateStatus(
  id: ObjectId,
  fromStatus: ServiceEngagementDoc["status"],
  toStatus: ServiceEngagementDoc["status"],
  extraFields: Partial<Pick<ServiceEngagementDoc, "activatedAt" | "pausedAt" | "completedAt">>,
): Promise<ServiceEngagementDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: { status: toStatus, updatedAt: new Date(), ...extraFields } },
    { returnDocument: "after" },
  );
}
