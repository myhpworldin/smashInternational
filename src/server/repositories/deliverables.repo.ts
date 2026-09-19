import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ClientDeliverableStatus } from "@/shared/types/deliverable";

const COLLECTION = "deliverables";

// Stage 1 Phase 22 §12/§13 — the real backend for Phase 12's top-level
// ClientDeliverable (distinct from projects.repo.ts's project-scoped
// ProjectDeliverable, which stays exactly what Phase 17 built it as: a
// milestone-breakdown item nested inside one project. This is the
// broader "any service/campaign/project, exists independently of a
// project" concept Phase 17 explicitly deferred to this phase).
// `ClientDeliverableStatus` (shared/types/deliverable.ts) is reused
// directly as this doc's own status field — every one of its values is
// already client-safe, so no separate internal-only status vocabulary is
// needed the way approvals.repo.ts needs one ("draft" there truly is
// internal-only; every deliverable status here is meant to be seen).
// Recommended indexes: { clientId: 1, updatedAt: -1 }, { clientId: 1 }.
export type DeliverableDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceId: string;
  projectId: ObjectId | null;
  campaignId: ObjectId | null;
  title: string;
  description: string | null;
  type: string;
  status: ClientDeliverableStatus;
  previewUrl: string | null;
  version: number;
  approvalId: ObjectId | null;
  dueDate: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<DeliverableDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  serviceId: string;
  projectId: ObjectId | null;
  campaignId: ObjectId | null;
  title: string;
  description: string | null;
  type: string;
  status: ClientDeliverableStatus;
  previewUrl: string | null;
  dueDate: Date | null;
  createdByUserId: ObjectId;
}): Promise<DeliverableDoc> {
  const now = new Date();
  const doc: DeliverableDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    serviceId: input.serviceId,
    projectId: input.projectId,
    campaignId: input.campaignId,
    title: input.title,
    description: input.description,
    type: input.type,
    status: input.status,
    previewUrl: input.previewUrl,
    version: 1,
    approvalId: null,
    dueDate: input.dueDate,
    submittedAt: null,
    completedAt: null,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<DeliverableDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<DeliverableDoc[]> {
  return (await collection()).find({ clientId }).sort({ updatedAt: -1 }).toArray();
}

export async function updateStatus(
  id: ObjectId,
  fromStatus: ClientDeliverableStatus,
  toStatus: ClientDeliverableStatus,
  updatedByUserId: ObjectId,
  extra: Partial<Pick<DeliverableDoc, "submittedAt" | "completedAt">> = {},
): Promise<DeliverableDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: { status: toStatus, updatedByUserId, updatedAt: new Date(), ...extra } },
    { returnDocument: "after" },
  );
}

// Links a deliverable to the approval created for it (§12's "approvalId
// where applicable") — set once, at approval-creation time.
export async function attachApproval(id: ObjectId, approvalId: ObjectId): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { approvalId, updatedAt: new Date() } });
}
