import "server-only";
import { ObjectId } from "mongodb";
import * as approvalsRepo from "@/server/repositories/approvals.repo";
import type { ApprovalDoc } from "@/server/repositories/approvals.repo";
import * as deliverablesRepo from "@/server/repositories/deliverables.repo";
import * as projectsRepo from "@/server/repositories/projects.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import * as clientNotificationsRepo from "@/server/repositories/clientNotifications.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import type { ApprovalItem, ApprovalStatus } from "@/shared/types/approval";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 22 §5-§11 — real persistence, replacing the Phase 12
// stub. Keeps the exact ApprovalItem shape the Phase 12 frontend already
// consumes. Only 4 of ApprovalStatus's 7 values are ever produced here
// (awaiting_client/viewed/approved/changes_requested) — "updated"/
// "resubmitted"/"completed" describe a richer re-review workflow the
// current data model's simpler resubmit-in-place transition doesn't need
// a separate status for (resubmitting already returns a client straight
// to "awaiting_client"); not every value of an existing type needs a
// producer, same precedent as Phase 20's funnel stages.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const CLIENT_VISIBLE_STATUSES = new Set<ApprovalDoc["status"]>(["awaiting_client", "viewed", "approved", "changes_requested"]);

async function relatedLabelFor(doc: ApprovalDoc): Promise<string | undefined> {
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

async function toApprovalItem(doc: ApprovalDoc): Promise<ApprovalItem | null> {
  if (!CLIENT_VISIBLE_STATUSES.has(doc.status)) return null;
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    type: doc.approvalType,
    serviceLabel: getServiceById(doc.serviceId)?.label,
    relatedLabel: await relatedLabelFor(doc),
    description: doc.description ?? undefined,
    previewUrl: doc.previewUrl ?? undefined,
    version: doc.version,
    status: doc.status as ApprovalStatus,
    submittedAt: doc.submittedAt.toISOString(),
  };
}

export async function listApprovalsForClient(clientId: ObjectId): Promise<ApprovalItem[]> {
  const docs = await approvalsRepo.listByClientId(clientId);
  const items = await Promise.all(docs.map(toApprovalItem));
  return items.filter((i): i is ApprovalItem => i !== null);
}

// Ownership enforced via assertClientOwnership (Phase 16 §6). Viewing an
// approval for the first time implicitly transitions it to "viewed"
// (§7's "client views" step) — there's no separate "mark as viewed"
// control in the already-built frontend (ApprovalActions.tsx only has
// Approve/Request Changes buttons), so the natural trigger for that
// transition is the client actually opening the detail page, the same
// way an email "read" receipt fires from opening the message rather than
// a dedicated button.
export async function getApprovalForClient(approvalId: string, clientId: ObjectId): Promise<ApprovalItem | null> {
  if (!ObjectId.isValid(approvalId)) return null;
  const doc = await approvalsRepo.findById(new ObjectId(approvalId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned || !CLIENT_VISIBLE_STATUSES.has(owned.status)) return null;

  if (owned.status === "awaiting_client") {
    const viewed = await approvalsRepo.updateStatus(owned._id, "awaiting_client", "viewed", {
      viewedAt: new Date(),
    });
    if (viewed) {
      await statusHistoryRepo.record({
        entityType: "approval",
        entityId: viewed._id,
        clientId,
        previousStatus: "awaiting_client",
        newStatus: "viewed",
        changedByUserId: clientId,
        changedByRole: "client",
      });
      return toApprovalItem(viewed);
    }
  }
  return toApprovalItem(owned);
}

// Explicit "mark as viewed" action (§8's conceptual POST .../view) for a
// future frontend that adds its own dedicated control — functionally
// idempotent with the implicit view-on-read above, safe to call either
// way or not at all.
export async function markApprovalViewedForClient(
  approvalId: string,
  clientId: ObjectId,
): Promise<ServiceResult<ApprovalItem>> {
  if (!ObjectId.isValid(approvalId)) return { ok: false, errors: ["Approval not found."] };
  const doc = await approvalsRepo.findById(new ObjectId(approvalId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return { ok: false, errors: ["Approval not found."] };

  if (owned.status !== "awaiting_client") {
    const item = await toApprovalItem(owned);
    return item ? { ok: true, data: item } : { ok: false, errors: ["Approval not found."] };
  }

  const viewed = await approvalsRepo.updateStatus(owned._id, "awaiting_client", "viewed", { viewedAt: new Date() });
  if (!viewed) return { ok: false, errors: ["This approval just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "approval",
    entityId: viewed._id,
    clientId,
    previousStatus: "awaiting_client",
    newStatus: "viewed",
    changedByUserId: clientId,
    changedByRole: "client",
  });

  const item = await toApprovalItem(viewed);
  return item ? { ok: true, data: item } : { ok: false, errors: ["Approval not found."] };
}

// §10 — actionable from awaiting_client or viewed only; rejects double-
// approval and approving a cancelled/already-terminal record outright.
export async function approveForClient(approvalId: string, clientId: ObjectId): Promise<ServiceResult<ApprovalItem>> {
  if (!ObjectId.isValid(approvalId)) return { ok: false, errors: ["Approval not found."] };
  const doc = await approvalsRepo.findById(new ObjectId(approvalId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return { ok: false, errors: ["Approval not found."] };

  if (owned.status === "approved") {
    return { ok: false, errors: ["This has already been approved."] };
  }
  if (owned.status !== "awaiting_client" && owned.status !== "viewed") {
    return { ok: false, errors: ["This approval can no longer be actioned."] };
  }

  const now = new Date();
  const updated = await approvalsRepo.updateStatus(owned._id, owned.status, "approved", {
    respondedAt: now,
    approvedAt: now,
    approvedByUserId: clientId,
  });
  if (!updated) return { ok: false, errors: ["This approval just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "approval",
    entityId: updated._id,
    clientId,
    previousStatus: owned.status,
    newStatus: "approved",
    changedByUserId: clientId,
    changedByRole: "client",
  });

  if (updated.deliverableId) {
    const deliverable = await deliverablesRepo.findById(updated.deliverableId);
    if (deliverable && deliverable.status === "waiting_for_approval") {
      await deliverablesRepo.updateStatus(deliverable._id, "waiting_for_approval", "approved", clientId);
    }
  }

  const item = await toApprovalItem(updated);
  return item ? { ok: true, data: item } : { ok: false, errors: ["Approval not found."] };
}

export async function requestChangesForClient(
  approvalId: string,
  clientId: ObjectId,
  comment: string,
): Promise<ServiceResult<ApprovalItem>> {
  if (!ObjectId.isValid(approvalId)) return { ok: false, errors: ["Approval not found."] };
  if (comment.trim().length === 0) return { ok: false, errors: ["Enter what needs to change."] };

  const doc = await approvalsRepo.findById(new ObjectId(approvalId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return { ok: false, errors: ["Approval not found."] };

  if (owned.status !== "awaiting_client" && owned.status !== "viewed") {
    return { ok: false, errors: ["This approval can no longer be actioned."] };
  }

  const now = new Date();
  const updated = await approvalsRepo.updateStatus(owned._id, owned.status, "changes_requested", {
    respondedAt: now,
    changesRequestedAt: now,
    changesRequestedByUserId: clientId,
    changeRequestComment: comment.trim(),
  });
  if (!updated) return { ok: false, errors: ["This approval just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "approval",
    entityId: updated._id,
    clientId,
    previousStatus: owned.status,
    newStatus: "changes_requested",
    changedByUserId: clientId,
    changedByRole: "client",
    reason: comment.trim(),
  });

  if (updated.deliverableId) {
    const deliverable = await deliverablesRepo.findById(updated.deliverableId);
    if (deliverable && deliverable.status === "waiting_for_approval") {
      await deliverablesRepo.updateStatus(deliverable._id, "waiting_for_approval", "changes_requested", clientId);
    }
  }

  const item = await toApprovalItem(updated);
  return item ? { ok: true, data: item } : { ok: false, errors: ["Approval not found."] };
}

// Admin-side creation (§5/§6) — validates the target service (and
// project/campaign/deliverable, when given) really belong to this
// client before anything is created. Sending the approval to the client
// is the same act as creating it (there's no separate internal-review
// "draft" step wired to any admin UI yet), so it's created directly at
// `awaiting_client`, and a real client notification fires immediately —
// exactly the "approval created → client notification" connection §33
// asks for, done as part of the same operation rather than a separate,
// droppable step (§34).
export async function createApprovalForAdmin(
  input: {
    clientId: ObjectId;
    serviceId: string;
    projectId?: ObjectId;
    campaignId?: ObjectId;
    deliverableId?: ObjectId;
    title: string;
    description?: string;
    approvalType: string;
    previewUrl?: string;
  },
  actor: Pick<UserDoc, "_id">,
): Promise<ServiceResult<ApprovalItem>> {
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
  if (input.deliverableId) {
    const deliverable = await deliverablesRepo.findById(input.deliverableId);
    if (!deliverable || !deliverable.clientId.equals(input.clientId)) {
      return { ok: false, errors: ["Deliverable not found for this client."] };
    }
  }

  const doc = await approvalsRepo.create({
    clientId: input.clientId,
    serviceId: input.serviceId,
    projectId: input.projectId ?? null,
    campaignId: input.campaignId ?? null,
    deliverableId: input.deliverableId ?? null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    approvalType: input.approvalType.trim(),
    previewUrl: input.previewUrl?.trim() || null,
    createdByUserId: actor._id,
  });

  if (doc.deliverableId) {
    await deliverablesRepo.attachApproval(doc.deliverableId, doc._id);
    await deliverablesRepo.updateStatus(doc.deliverableId, "ready_for_review", "waiting_for_approval", actor._id).catch(() => null);
  }

  await statusHistoryRepo.record({
    entityType: "approval",
    entityId: doc._id,
    clientId: input.clientId,
    previousStatus: null,
    newStatus: "awaiting_client",
    changedByUserId: actor._id,
    changedByRole: "admin",
  });

  await clientNotificationsRepo.upsertForEvent({
    clientId: input.clientId,
    type: "approval_requested",
    title: `Review needed: ${doc.title}`,
    message: `${doc.title} is ready for your review.`,
    entityType: "approval",
    entityId: doc._id,
    href: `/dashboard/approvals/${doc._id.toHexString()}`,
  });

  const item = await toApprovalItem(doc);
  return item ? { ok: true, data: item } : { ok: false, errors: ["Something went wrong."] };
}

// §7/§26 — the only path back to awaiting_client from changes_requested;
// a controlled, explicit admin action, never automatic.
export async function resubmitApprovalForAdmin(
  approvalId: ObjectId,
  fields: { title?: string; description?: string; previewUrl?: string },
  actor: Pick<UserDoc, "_id">,
): Promise<ServiceResult<ApprovalItem>> {
  const existing = await approvalsRepo.findById(approvalId);
  if (!existing) return { ok: false, errors: ["Approval not found."] };
  if (existing.status !== "changes_requested") {
    return { ok: false, errors: ["Only an approval with changes requested can be resubmitted."] };
  }

  const updated = await approvalsRepo.resubmit(approvalId, fields);
  if (!updated) return { ok: false, errors: ["This approval just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "approval",
    entityId: updated._id,
    clientId: updated.clientId,
    previousStatus: "changes_requested",
    newStatus: "awaiting_client",
    changedByUserId: actor._id,
    changedByRole: "admin",
    reason: `Resubmitted as version ${updated.version}`,
  });

  await clientNotificationsRepo.upsertForEvent({
    clientId: updated.clientId,
    type: "approval_requested",
    title: `Updated for review: ${updated.title}`,
    message: `${updated.title} was updated and is ready for another look.`,
    entityType: "approval",
    entityId: updated._id,
    href: `/dashboard/approvals/${updated._id.toHexString()}`,
  });

  const item = await toApprovalItem(updated);
  return item ? { ok: true, data: item } : { ok: false, errors: ["Something went wrong."] };
}
