import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ClientProjectStatus } from "@/shared/types/project";

const COLLECTION = "projects";

// Stage 1 Phase 17 — a real, persistent project record, replacing
// projects.service.ts's Phase 9 stub (which always returned []/null).
// References serviceEngagementId (Phase 3/4's serviceEngagements
// collection) rather than duplicating service data — a project always
// belongs to exactly one service engagement, never a bare serviceId
// alone, so "which engagement authorized this project" is never
// ambiguous. clientId is denormalized onto the project (not derived via a
// join every read) since every client-facing query filters by it
// directly — same convention serviceEngagements.repo.ts already uses.
// Recommended indexes (created manually, same convention as every other
// repo this session): { clientId: 1 }, { serviceEngagementId: 1 },
// { clientId: 1, status: 1 }.
export type ProjectDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  name: string;
  description: string | null;
  status: ClientProjectStatus;
  progress: number | null;
  startDate: Date | null;
  targetEndDate: Date | null;
  completedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ProjectDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  name: string;
  description: string | null;
  status: ClientProjectStatus;
  progress: number | null;
  startDate: Date | null;
  targetEndDate: Date | null;
  createdByUserId: ObjectId;
}): Promise<ProjectDoc> {
  const now = new Date();
  const doc: ProjectDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    serviceEngagementId: input.serviceEngagementId,
    serviceId: input.serviceId,
    name: input.name,
    description: input.description,
    status: input.status,
    progress: input.progress,
    startDate: input.startDate,
    targetEndDate: input.targetEndDate,
    completedDate: null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<ProjectDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<ProjectDoc[]> {
  return (await collection()).find({ clientId }).sort({ createdAt: 1 }).toArray();
}

// Conditioned on the project still being exactly at `fromStatus`
// (same concurrency guard as serviceEngagements.repo.ts's updateStatus) —
// a concurrent second admin action between the caller's read and this
// write matches zero documents rather than silently overwriting a status
// this call never actually observed.
export async function updateStatus(
  id: ObjectId,
  fromStatus: ClientProjectStatus,
  toStatus: ClientProjectStatus,
  updatedByUserId: ObjectId,
  extra: { completedAt?: Date; progress?: number } = {},
): Promise<ProjectDoc | null> {
  const now = new Date();
  const setFields: Record<string, unknown> = { status: toStatus, updatedAt: now, updatedByUserId };
  if (extra.completedAt !== undefined) setFields.completedDate = extra.completedAt;
  if (extra.progress !== undefined) setFields.progress = extra.progress;

  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: setFields },
    { returnDocument: "after" },
  );
}
