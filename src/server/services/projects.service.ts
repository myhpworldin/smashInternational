import "server-only";
import { ObjectId } from "mongodb";
import * as projectsRepo from "@/server/repositories/projects.repo";
import type { ProjectDoc } from "@/server/repositories/projects.repo";
import * as milestonesRepo from "@/server/repositories/milestones.repo";
import type { MilestoneDoc } from "@/server/repositories/milestones.repo";
import * as projectDeliverablesRepo from "@/server/repositories/projectDeliverables.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import {
  isValidProjectTransition,
  type ClientProject,
  type ClientProjectStatus,
  type MilestoneStatus,
} from "@/shared/types/project";

// Stage 1 Phase 17 — real persistence, replacing the Phase 9 stub (which
// always returned []/null). Every function here keeps the exact
// ClientProject/ProjectMilestone/ProjectDeliverable shapes the Phase 9-15
// frontend already consumes — no page or component needed to change for
// this phase to take effect.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

async function toClientProject(
  doc: ProjectDoc,
  milestones: MilestoneDoc[],
  deliverables: Awaited<ReturnType<typeof projectDeliverablesRepo.listByProjectId>>,
): Promise<ClientProject> {
  return {
    id: doc._id.toHexString(),
    clientId: doc.clientId.toHexString(),
    serviceId: doc.serviceId,
    serviceLabel: getServiceById(doc.serviceId)?.label ?? doc.serviceId,
    name: doc.name,
    description: doc.description ?? undefined,
    status: doc.status,
    progress: doc.progress ?? undefined,
    startDate: doc.startDate ? doc.startDate.toISOString() : undefined,
    targetEndDate: doc.targetEndDate ? doc.targetEndDate.toISOString() : undefined,
    completedDate: doc.completedDate ? doc.completedDate.toISOString() : undefined,
    milestones: milestones
      .filter((m) => m.clientVisible)
      .map((m) => ({
        id: m._id.toHexString(),
        name: m.title,
        status: m.status,
        completedAt: m.completedAt ? m.completedAt.toISOString() : undefined,
      })),
    deliverables: deliverables
      .filter((d) => d.clientVisible)
      .map((d) => ({
        id: d._id.toHexString(),
        name: d.name,
        type: d.type ?? undefined,
        status: d.status,
        submittedAt: d.submittedAt ? d.submittedAt.toISOString() : undefined,
        updatedAt: d.updatedAt.toISOString(),
      })),
    // Client-safe event timeline isn't backed by anything yet this phase
    // (no audit/history collection scoped to projects exists) — honestly
    // empty rather than derived from milestone dates in a way that could
    // silently duplicate/disagree with the milestones list above.
    timeline: [],
    latestUpdate: null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listProjectsForClient(clientId: ObjectId): Promise<ClientProject[]> {
  const docs = await projectsRepo.listByClientId(clientId);
  if (docs.length === 0) return [];

  const projectIds = docs.map((d) => d._id);
  const [allMilestones, allDeliverables] = await Promise.all([
    milestonesRepo.listByProjectIds(projectIds),
    projectDeliverablesRepo.listByProjectIds(projectIds),
  ]);
  const milestonesByProject = new Map<string, MilestoneDoc[]>();
  for (const m of allMilestones) {
    const key = m.projectId.toHexString();
    milestonesByProject.set(key, [...(milestonesByProject.get(key) ?? []), m]);
  }
  const deliverablesByProject = new Map<string, typeof allDeliverables>();
  for (const d of allDeliverables) {
    const key = d.projectId.toHexString();
    deliverablesByProject.set(key, [...(deliverablesByProject.get(key) ?? []), d]);
  }

  return Promise.all(
    docs.map((doc) =>
      toClientProject(
        doc,
        milestonesByProject.get(doc._id.toHexString()) ?? [],
        deliverablesByProject.get(doc._id.toHexString()) ?? [],
      ),
    ),
  );
}

// Ownership enforced via assertClientOwnership (Phase 16 §6) — a project
// id that exists but belongs to another client returns null, same as one
// that doesn't exist at all.
export async function getProjectForClient(projectId: string, clientId: ObjectId): Promise<ClientProject | null> {
  if (!ObjectId.isValid(projectId)) return null;
  const doc = await projectsRepo.findById(new ObjectId(projectId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return null;

  const [milestones, deliverables] = await Promise.all([
    milestonesRepo.listByProjectId(owned._id),
    projectDeliverablesRepo.listByProjectId(owned._id),
  ]);
  return toClientProject(owned, milestones, deliverables);
}

// Admin-side creation (Phase 17 §11/§22) — validates the target service
// engagement is real and actually belongs to the given client before
// creating anything under it, so a project can never be attached to the
// wrong client's engagement even via a tampered request.
export async function createProjectForAdmin(
  input: {
    clientId: ObjectId;
    serviceEngagementId: ObjectId;
    name: string;
    description?: string;
    status: ClientProjectStatus;
    progress?: number;
    startDate?: Date;
    targetEndDate?: Date;
    milestones: { title: string; status: MilestoneStatus }[];
  },
  actorUserId: ObjectId,
): Promise<ServiceResult<ClientProject>> {
  if (input.name.trim().length === 0) {
    return { ok: false, errors: ["Project name is required."] };
  }
  if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
    return { ok: false, errors: ["Progress must be between 0 and 100."] };
  }
  if (input.startDate && input.targetEndDate && input.targetEndDate < input.startDate) {
    return { ok: false, errors: ["Expected completion cannot be before the start date."] };
  }

  const engagement = await serviceEngagementsRepo.findById(input.serviceEngagementId);
  if (!engagement || !engagement.clientId.equals(input.clientId)) {
    return { ok: false, errors: ["Service engagement not found for this client."] };
  }

  const doc = await projectsRepo.create({
    clientId: input.clientId,
    serviceEngagementId: engagement._id,
    serviceId: engagement.serviceId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    progress: input.progress ?? null,
    startDate: input.startDate ?? null,
    targetEndDate: input.targetEndDate ?? null,
    createdByUserId: actorUserId,
  });

  const milestones = await milestonesRepo.createMany(
    doc._id,
    input.milestones.filter((m) => m.title.trim().length > 0),
  );

  return { ok: true, data: await toClientProject(doc, milestones, []) };
}

// Admin-side status/progress update (Phase 17 §12-13/§24) — the caller is
// already an authorized admin (checked by the route), who by the
// existing role model has access to every client's records, so this
// looks the project up by id alone rather than requiring (and having to
// validate) a separately-supplied clientId — there is no tenant boundary
// to cross-check here, only "does this project exist." The transition
// graph is authoritative; re-sending the current status is a safe no-op
// (same idempotency rule as serviceEngagements.service.ts's
// updateEngagementStatus).
export async function updateProjectStatusForAdmin(
  projectId: ObjectId,
  nextStatus: ClientProjectStatus,
  actorUserId: ObjectId,
  progress?: number,
): Promise<ServiceResult<ClientProject>> {
  const owned = await projectsRepo.findById(projectId);
  if (!owned) {
    return { ok: false, errors: ["Project not found."] };
  }
  if (progress !== undefined && (progress < 0 || progress > 100)) {
    return { ok: false, errors: ["Progress must be between 0 and 100."] };
  }

  if (owned.status === nextStatus) {
    const [milestones, deliverables] = await Promise.all([
      milestonesRepo.listByProjectId(owned._id),
      projectDeliverablesRepo.listByProjectId(owned._id),
    ]);
    return { ok: true, data: await toClientProject(owned, milestones, deliverables) };
  }

  if (!isValidProjectTransition(owned.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a project from "${owned.status}" to "${nextStatus}".`] };
  }

  const updated = await projectsRepo.updateStatus(owned._id, owned.status, nextStatus, actorUserId, {
    completedAt: nextStatus === "completed" ? new Date() : undefined,
    progress,
  });
  if (!updated) {
    return { ok: false, errors: ["This project's status just changed. Refresh and try again."] };
  }

  const [milestones, deliverables] = await Promise.all([
    milestonesRepo.listByProjectId(updated._id),
    projectDeliverablesRepo.listByProjectId(updated._id),
  ]);
  return { ok: true, data: await toClientProject(updated, milestones, deliverables) };
}
