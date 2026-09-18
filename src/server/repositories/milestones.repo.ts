import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { MilestoneStatus } from "@/shared/types/project";

const COLLECTION = "projectMilestones";

// Stage 1 Phase 17 §14 — one row per milestone rather than an embedded
// array on the project document, so a milestone can be added/reordered
// without rewriting the whole project, and so `clientVisible` can hide an
// internal-only step from the client's own project-detail read without
// needing a second, parallel "client milestones" list. Recommended
// indexes: { projectId: 1, order: 1 }.
export type MilestoneDoc = {
  _id: ObjectId;
  projectId: ObjectId;
  title: string;
  status: MilestoneStatus;
  order: number;
  completedAt: Date | null;
  clientVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<MilestoneDoc>(COLLECTION);
}

export async function createMany(
  projectId: ObjectId,
  milestones: { title: string; status: MilestoneStatus }[],
): Promise<MilestoneDoc[]> {
  if (milestones.length === 0) return [];
  const now = new Date();
  const docs: MilestoneDoc[] = milestones.map((m, index) => ({
    _id: new ObjectId(),
    projectId,
    title: m.title,
    status: m.status,
    order: index,
    completedAt: m.status === "completed" ? now : null,
    clientVisible: true,
    createdAt: now,
    updatedAt: now,
  }));
  await (await collection()).insertMany(docs);
  return docs;
}

export async function listByProjectId(projectId: ObjectId): Promise<MilestoneDoc[]> {
  return (await collection()).find({ projectId }).sort({ order: 1 }).toArray();
}

export async function listByProjectIds(projectIds: ObjectId[]): Promise<MilestoneDoc[]> {
  if (projectIds.length === 0) return [];
  return (await collection()).find({ projectId: { $in: projectIds } }).sort({ order: 1 }).toArray();
}
