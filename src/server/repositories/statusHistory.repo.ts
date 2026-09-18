import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role } from "@/shared/types/user";
import type { StatusHistoryEntityType } from "@/shared/types/statusHistory";

const COLLECTION = "statusHistory";

// Append-only — never updated or deleted once written (Phase 4 §11/§31:
// every lifecycle transition must be traceable). Recommended indexes
// (created manually, same convention as serviceAssignments.repo.ts/
// serviceEngagements.repo.ts): { entityType: 1, entityId: 1 },
// { clientId: 1 }.
export type StatusHistoryDoc = {
  _id: ObjectId;
  entityType: StatusHistoryEntityType;
  entityId: ObjectId;
  clientId: ObjectId;
  previousStatus: string | null;
  newStatus: string;
  changedByUserId: ObjectId;
  changedByRole: Role;
  reason: string | null;
  changedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<StatusHistoryDoc>(COLLECTION);
}

export async function record(input: {
  entityType: StatusHistoryEntityType;
  entityId: ObjectId;
  clientId: ObjectId;
  previousStatus: string | null;
  newStatus: string;
  changedByUserId: ObjectId;
  changedByRole: Role;
  reason?: string | null;
}): Promise<void> {
  const doc: StatusHistoryDoc = {
    _id: new ObjectId(),
    entityType: input.entityType,
    entityId: input.entityId,
    clientId: input.clientId,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    changedByUserId: input.changedByUserId,
    changedByRole: input.changedByRole,
    reason: input.reason ?? null,
    changedAt: new Date(),
  };
  await (await collection()).insertOne(doc);
}

export async function listByEntity(
  entityType: StatusHistoryEntityType,
  entityId: ObjectId,
): Promise<StatusHistoryDoc[]> {
  return (await collection()).find({ entityType, entityId }).sort({ changedAt: 1 }).toArray();
}

// Stage 1 Phase 7 — every transition (onboarding and every service
// engagement) for one client, newest first, capped at `limit`. Backs the
// client dashboard's Recent Activity feed — the `clientId` field on every
// entry exists specifically for this cross-entity query, so a client's
// full timeline never needs one lookup per entity.
export async function listByClientId(clientId: ObjectId, limit: number): Promise<StatusHistoryDoc[]> {
  return (await collection()).find({ clientId }).sort({ changedAt: -1 }).limit(limit).toArray();
}
