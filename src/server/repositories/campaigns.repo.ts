import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ClientCampaignStatus } from "@/shared/types/campaign";

const COLLECTION = "campaigns";

// Stage 1 Phase 18 — a real, persistent campaign record, same pattern as
// projects.repo.ts (Phase 17): references a real serviceEngagementId
// rather than a bare serviceId, clientId denormalized for direct
// client-scoped queries. `budget`/`spend` are the only stored monetary
// fields — remaining is always derived (budget - spend) at the service
// layer, never stored, so there is exactly one source of truth for it
// (§7/§15: "prefer derived calculation rather than storing a second
// manually-editable remaining value"). Recommended indexes: { clientId: 1 },
// { serviceEngagementId: 1 }, { clientId: 1, status: 1 }.
export type CampaignDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  name: string;
  platform: string | null;
  objective: string | null;
  status: ClientCampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  spend: number;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<CampaignDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  name: string;
  platform: string | null;
  objective: string | null;
  status: ClientCampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  spend?: number;
  createdByUserId: ObjectId;
}): Promise<CampaignDoc> {
  const now = new Date();
  const doc: CampaignDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    serviceEngagementId: input.serviceEngagementId,
    serviceId: input.serviceId,
    name: input.name,
    platform: input.platform,
    objective: input.objective,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    budget: input.budget,
    spend: input.spend ?? 0,
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<CampaignDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<CampaignDoc[]> {
  return (await collection()).find({ clientId }).sort({ createdAt: 1 }).toArray();
}

// Conditioned on the campaign still being exactly at `fromStatus` — same
// concurrency guard as projects.repo.ts/serviceEngagements.repo.ts.
export async function updateStatus(
  id: ObjectId,
  fromStatus: ClientCampaignStatus,
  toStatus: ClientCampaignStatus,
  updatedByUserId: ObjectId,
): Promise<CampaignDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: { status: toStatus, updatedAt: new Date(), updatedByUserId } },
    { returnDocument: "after" },
  );
}

// Spend/budget are updated independently of status (§9: "spend may be
// manually maintained" separately from the lifecycle) — plain $set, no
// transition graph involved.
export async function updateFinancials(
  id: ObjectId,
  fields: { budget?: number; spend?: number },
  updatedByUserId: ObjectId,
): Promise<CampaignDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id },
    { $set: { ...fields, updatedAt: new Date(), updatedByUserId } },
    { returnDocument: "after" },
  );
}
