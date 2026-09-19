import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";

const COLLECTION = "approvals";

// Stage 1 Phase 22 §5/§6 — the client approval-workflow backend for
// Phase 12's ApprovalItem contract. `approvalType` is a free-form string
// (creative/social_content/advertisement/video/document/deliverable/
// other) rather than a closed enum, per §5's explicit "do not tightly
// couple the approval system to only one content type." `deliverableId`
// links back to deliverables.repo.ts's top-level ClientDeliverable when
// the approval is about one (most cases); `serviceId`/`projectId`/
// `campaignId` are denormalized directly onto the approval so ownership
// and listing never need a join back through the deliverable.
// `draft` is intentionally not client-visible (see approvals.service.ts's
// toClientApproval, which returns null for it) — it exists so an admin
// can prepare an approval before it's actually sent to the client.
// Recommended indexes: { clientId: 1, status: 1, submittedAt: -1 },
// { clientId: 1 }.
export type ApprovalDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceId: string;
  projectId: ObjectId | null;
  campaignId: ObjectId | null;
  deliverableId: ObjectId | null;
  title: string;
  description: string | null;
  approvalType: string;
  status: "draft" | "awaiting_client" | "viewed" | "approved" | "changes_requested" | "cancelled";
  previewUrl: string | null;
  version: number;
  submittedAt: Date;
  viewedAt: Date | null;
  respondedAt: Date | null;
  approvedAt: Date | null;
  changesRequestedAt: Date | null;
  approvedByUserId: ObjectId | null;
  changesRequestedByUserId: ObjectId | null;
  changeRequestComment: string | null;
  createdByUserId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ApprovalDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  serviceId: string;
  projectId: ObjectId | null;
  campaignId: ObjectId | null;
  deliverableId: ObjectId | null;
  title: string;
  description: string | null;
  approvalType: string;
  previewUrl: string | null;
  createdByUserId: ObjectId;
}): Promise<ApprovalDoc> {
  const now = new Date();
  const doc: ApprovalDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    serviceId: input.serviceId,
    projectId: input.projectId,
    campaignId: input.campaignId,
    deliverableId: input.deliverableId,
    title: input.title,
    description: input.description,
    approvalType: input.approvalType,
    status: "awaiting_client",
    previewUrl: input.previewUrl,
    version: 1,
    submittedAt: now,
    viewedAt: null,
    respondedAt: null,
    approvedAt: null,
    changesRequestedAt: null,
    approvedByUserId: null,
    changesRequestedByUserId: null,
    changeRequestComment: null,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<ApprovalDoc | null> {
  return (await collection()).findOne({ _id: id });
}

// Actionable-first, most-recent-next (§43) — pending_client/viewed sort
// before the terminal states, ties broken by submittedAt descending.
export async function listByClientId(clientId: ObjectId): Promise<ApprovalDoc[]> {
  const docs = await (await collection()).find({ clientId, status: { $ne: "draft" } }).sort({ submittedAt: -1 }).toArray();
  const rank: Record<ApprovalDoc["status"], number> = {
    awaiting_client: 0,
    viewed: 0,
    changes_requested: 1,
    approved: 2,
    cancelled: 3,
    draft: 4,
  };
  return docs.sort((a, b) => rank[a.status] - rank[b.status]);
}

// Conditioned on the approval still being exactly at `fromStatus` — same
// concurrency guard every other status-transition repo in this codebase
// uses, so a double-click can never apply the same transition twice.
export async function updateStatus(
  id: ObjectId,
  fromStatus: ApprovalDoc["status"],
  toStatus: ApprovalDoc["status"],
  extra: Partial<
    Pick<
      ApprovalDoc,
      | "viewedAt"
      | "respondedAt"
      | "approvedAt"
      | "changesRequestedAt"
      | "approvedByUserId"
      | "changesRequestedByUserId"
      | "changeRequestComment"
    >
  > = {},
): Promise<ApprovalDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: { status: toStatus, updatedAt: new Date(), ...extra } },
    { returnDocument: "after" },
  );
}

// Resubmission after changes requested (§7's "team updates work → waiting
// for client again") — a controlled, explicit admin action, never a
// silent auto-transition. Bumps `version` and clears every prior response
// field so the new round starts from a clean slate.
export async function resubmit(
  id: ObjectId,
  fields: { title?: string; description?: string | null; previewUrl?: string | null },
): Promise<ApprovalDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: "changes_requested" },
    {
      $set: {
        ...fields,
        status: "awaiting_client",
        submittedAt: new Date(),
        viewedAt: null,
        respondedAt: null,
        changesRequestedAt: null,
        changesRequestedByUserId: null,
        changeRequestComment: null,
        updatedAt: new Date(),
      },
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  );
}
