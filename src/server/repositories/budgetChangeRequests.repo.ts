import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { BudgetRequestStatus } from "@/shared/types/budget";

const COLLECTION = "budgetChangeRequests";

// Stage 1 Phase 18 §20-25. `currentAllocation` is captured at request
// time and never updated afterward — it's the staleness-check baseline
// (§25): approval compares this frozen value against the budget's live
// value right before applying, and refuses if they've diverged. status
// transitions are pending -> approved|rejected|cancelled only, enforced
// in budget.service.ts, never here. Recommended indexes: { clientId: 1 },
// { status: 1 }.
export type BudgetChangeRequestDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  channelName: string | null;
  campaignName: string | null;
  currentAllocation: number;
  requestedAllocation: number;
  reason: string;
  status: BudgetRequestStatus;
  requestedByUserId: ObjectId;
  reviewedByUserId: ObjectId | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<BudgetChangeRequestDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  channelName: string | null;
  campaignName: string | null;
  currentAllocation: number;
  requestedAllocation: number;
  reason: string;
  requestedByUserId: ObjectId;
}): Promise<BudgetChangeRequestDoc> {
  const doc: BudgetChangeRequestDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    channelName: input.channelName,
    campaignName: input.campaignName,
    currentAllocation: input.currentAllocation,
    requestedAllocation: input.requestedAllocation,
    reason: input.reason,
    status: "pending",
    requestedByUserId: input.requestedByUserId,
    reviewedByUserId: null,
    requestedAt: new Date(),
    reviewedAt: null,
    reviewNote: null,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function listByClientId(clientId: ObjectId): Promise<BudgetChangeRequestDoc[]> {
  return (await collection()).find({ clientId }).sort({ requestedAt: -1 }).toArray();
}

export async function findById(id: ObjectId, session?: ClientSession): Promise<BudgetChangeRequestDoc | null> {
  return (await collection()).findOne({ _id: id }, { session });
}

// Conditioned on the request still being exactly "pending" (§24: "a
// pending budget request must not be approvable twice") — a concurrent
// second approval/rejection attempt matches zero documents.
export async function updateStatus(
  id: ObjectId,
  toStatus: BudgetRequestStatus,
  reviewedByUserId: ObjectId,
  reviewNote: string | null,
  session?: ClientSession,
): Promise<BudgetChangeRequestDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: toStatus, reviewedByUserId, reviewedAt: new Date(), reviewNote } },
    { session, returnDocument: "after" },
  );
}
