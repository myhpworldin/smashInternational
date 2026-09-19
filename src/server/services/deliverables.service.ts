import "server-only";
import { ObjectId } from "mongodb";
import * as deliverablesRepo from "@/server/repositories/deliverables.repo";
import type { DeliverableDoc } from "@/server/repositories/deliverables.repo";
import * as projectsRepo from "@/server/repositories/projects.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as approvalsRepo from "@/server/repositories/approvals.repo";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import * as clientNotificationsRepo from "@/server/repositories/clientNotifications.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import type { ApprovalStatus } from "@/shared/types/approval";
import type { ClientDeliverable, ClientDeliverableStatus } from "@/shared/types/deliverable";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 22 §12-§14 — real persistence, replacing the Phase 12
// stub for the top-level, cross-service ClientDeliverable (distinct from
// projects.service.ts's project-scoped milestone breakdown — see
// deliverables.repo.ts's header note).

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// Every deliverable status transition a client should be able to
// observe (§14 — internal workflow detail beyond this stays server-side
// only, though this data model doesn't currently have any extra internal
// steps beyond what's already client-safe).
const VALID_DELIVERABLE_TRANSITIONS: Record<ClientDeliverableStatus, readonly ClientDeliverableStatus[]> = {
  draft: ["in_progress"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["waiting_for_approval", "changes_requested"],
  waiting_for_approval: ["approved", "changes_requested"],
  changes_requested: ["in_progress", "ready_for_review"],
  approved: ["completed"],
  completed: ["delivered"],
  delivered: [],
};

function isValidDeliverableTransition(from: ClientDeliverableStatus, to: ClientDeliverableStatus): boolean {
  return VALID_DELIVERABLE_TRANSITIONS[from].includes(to);
}

async function relatedLabelFor(doc: DeliverableDoc): Promise<string | undefined> {
  if (doc.projectId) {
    const project = await projectsRepo.findById(doc.projectId);
    return project?.name;
  }
  if (doc.campaignId) {
    const campaign = await campaignsRepo.findById(doc.campaignId);
    return campaign?.name;
  }
  return undefined;
}

async function toClientDeliverable(doc: DeliverableDoc): Promise<ClientDeliverable> {
  let approvalStatus: ApprovalStatus | undefined;
  if (doc.approvalId) {
    const approval = await approvalsRepo.findById(doc.approvalId);
    if (approval && approval.status !== "draft" && approval.status !== "cancelled") {
      approvalStatus = approval.status as ApprovalStatus;
    }
  }

  return {
    id: doc._id.toHexString(),
    title: doc.title,
    type: doc.type,
    serviceLabel: getServiceById(doc.serviceId)?.label,
    relatedLabel: await relatedLabelFor(doc),
    description: doc.description ?? undefined,
    previewUrl: doc.previewUrl ?? undefined,
    version: doc.version,
    status: doc.status,
    approvalStatus,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listDeliverablesForClient(clientId: ObjectId): Promise<ClientDeliverable[]> {
  const docs = await deliverablesRepo.listByClientId(clientId);
  return Promise.all(docs.map(toClientDeliverable));
}

export async function getDeliverableForClient(
  deliverableId: string,
  clientId: ObjectId,
): Promise<ClientDeliverable | null> {
  if (!ObjectId.isValid(deliverableId)) return null;
  const doc = await deliverablesRepo.findById(new ObjectId(deliverableId));
  const owned = assertClientOwnership(doc, clientId);
  return owned ? toClientDeliverable(owned) : null;
}

// Admin-side creation (§12/§13) — same relationship-validation pattern as
// projects/campaigns: the service engagement (and project/campaign, when
// given) must actually belong to this client.
export async function createDeliverableForAdmin(
  input: {
    clientId: ObjectId;
    serviceId: string;
    projectId?: ObjectId;
    campaignId?: ObjectId;
    title: string;
    description?: string;
    type: string;
    status?: ClientDeliverableStatus;
    previewUrl?: string;
    dueDate?: Date;
  },
  actor: Pick<UserDoc, "_id">,
): Promise<ServiceResult<ClientDeliverable>> {
  if (input.title.trim().length === 0) {
    return { ok: false, errors: ["Title is required."] };
  }

  const engagement = await serviceEngagementsRepo.findLiveByClientAndService(input.clientId, input.serviceId);
  if (!engagement) {
    return { ok: false, errors: ["This service is not active for this client."] };
  }
  if (input.projectId) {
    const project = await projectsRepo.findById(input.projectId);
    if (!project || !project.clientId.equals(input.clientId)) {
      return { ok: false, errors: ["Project not found for this client."] };
    }
  }
  if (input.campaignId) {
    const campaign = await campaignsRepo.findById(input.campaignId);
    if (!campaign || !campaign.clientId.equals(input.clientId)) {
      return { ok: false, errors: ["Campaign not found for this client."] };
    }
  }

  const doc = await deliverablesRepo.create({
    clientId: input.clientId,
    serviceId: input.serviceId,
    projectId: input.projectId ?? null,
    campaignId: input.campaignId ?? null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    type: input.type.trim(),
    status: input.status ?? "draft",
    previewUrl: input.previewUrl?.trim() || null,
    dueDate: input.dueDate ?? null,
    createdByUserId: actor._id,
  });

  await statusHistoryRepo.record({
    entityType: "deliverable",
    entityId: doc._id,
    clientId: input.clientId,
    previousStatus: null,
    newStatus: doc.status,
    changedByUserId: actor._id,
    changedByRole: "admin",
  });

  return { ok: true, data: await toClientDeliverable(doc) };
}

// §14 — transition-graph enforced; "ready_for_review" reaching the
// client's attention fires the one deliverable-specific notification
// event (§20's "Deliverable ready" — distinct from an approval being
// requested, which is its own separate event when one is created).
export async function updateDeliverableStatusForAdmin(
  deliverableId: ObjectId,
  nextStatus: ClientDeliverableStatus,
  actor: Pick<UserDoc, "_id">,
): Promise<ServiceResult<ClientDeliverable>> {
  const existing = await deliverablesRepo.findById(deliverableId);
  if (!existing) return { ok: false, errors: ["Deliverable not found."] };

  if (existing.status === nextStatus) {
    return { ok: true, data: await toClientDeliverable(existing) };
  }
  if (!isValidDeliverableTransition(existing.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a deliverable from "${existing.status}" to "${nextStatus}".`] };
  }

  const extra: Parameters<typeof deliverablesRepo.updateStatus>[4] = {};
  if (nextStatus === "completed") extra.completedAt = new Date();
  if (nextStatus === "ready_for_review") extra.submittedAt = new Date();

  const updated = await deliverablesRepo.updateStatus(existing._id, existing.status, nextStatus, actor._id, extra);
  if (!updated) return { ok: false, errors: ["This deliverable just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "deliverable",
    entityId: updated._id,
    clientId: updated.clientId,
    previousStatus: existing.status,
    newStatus: nextStatus,
    changedByUserId: actor._id,
    changedByRole: "admin",
  });

  if (nextStatus === "ready_for_review") {
    await clientNotificationsRepo.upsertForEvent({
      clientId: updated.clientId,
      type: "deliverable_ready",
      title: `Ready for review: ${updated.title}`,
      message: `${updated.title} is ready for your review.`,
      entityType: "deliverable",
      entityId: updated._id,
      href: `/dashboard/deliverables/${updated._id.toHexString()}`,
    });
  }

  return { ok: true, data: await toClientDeliverable(updated) };
}
