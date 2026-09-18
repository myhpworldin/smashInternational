import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { DeliverableStatus } from "@/shared/types/project";

const COLLECTION = "projectDeliverables";

// Stage 1 Phase 17 §15 — the project-scoped deliverable record (distinct
// from Phase 12's standalone, cross-service ClientDeliverable/
// deliverables.service.ts, which stays a stub this phase — that's a
// broader "any service/campaign" concept better scoped alongside the
// later approvals/documents work in Phase 22, per this phase's own
// boundary of "Project Deliverables" specifically). No admin UI creates
// these yet (Phase 13's AdminProjectsPanel only collects milestones on
// create) — this repo exists so the client-facing project detail page's
// `deliverables` array has a real (currently empty per project) source
// instead of a permanent stub, ready for whichever phase adds the
// admin-side creation UI. Recommended indexes: { projectId: 1 }.
export type ProjectDeliverableDoc = {
  _id: ObjectId;
  projectId: ObjectId;
  name: string;
  type: string | null;
  status: DeliverableStatus;
  submittedAt: Date | null;
  clientVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ProjectDeliverableDoc>(COLLECTION);
}

export async function listByProjectId(projectId: ObjectId): Promise<ProjectDeliverableDoc[]> {
  return (await collection()).find({ projectId }).sort({ createdAt: 1 }).toArray();
}

export async function listByProjectIds(projectIds: ObjectId[]): Promise<ProjectDeliverableDoc[]> {
  if (projectIds.length === 0) return [];
  return (await collection()).find({ projectId: { $in: projectIds } }).sort({ createdAt: 1 }).toArray();
}
