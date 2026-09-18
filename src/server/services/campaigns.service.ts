import "server-only";
import { ObjectId } from "mongodb";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import type { CampaignDoc } from "@/server/repositories/campaigns.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import { isValidCampaignTransition, type ClientCampaign, type ClientCampaignStatus } from "@/shared/types/campaign";

// Stage 1 Phase 18 — real persistence, replacing the Phase 9 stub. Same
// pattern as projects.service.ts (Phase 17): the ClientCampaign shape the
// Phase 9-15 frontend already consumes doesn't change, so no page or
// component needs to change for this phase to take effect.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function toClientCampaign(doc: CampaignDoc): ClientCampaign {
  return {
    id: doc._id.toHexString(),
    clientId: doc.clientId.toHexString(),
    serviceId: doc.serviceId,
    serviceLabel: getServiceById(doc.serviceId)?.label ?? doc.serviceId,
    name: doc.name,
    platform: doc.platform ?? undefined,
    objective: doc.objective ?? undefined,
    status: doc.status,
    startDate: doc.startDate ? doc.startDate.toISOString() : undefined,
    endDate: doc.endDate ? doc.endDate.toISOString() : undefined,
    budget: doc.budget ?? undefined,
    spent: doc.budget !== null ? doc.spend : undefined,
    // Always derived, never stored (§7/§15) — the one source of truth is
    // budget - spend, computed here on every read. Floored at 0 as a
    // defensive guard; updateCampaignFinancialsForAdmin already rejects
    // any write that would make spend exceed budget in the first place.
    remaining: doc.budget !== null ? Math.max(doc.budget - doc.spend, 0) : undefined,
    latestUpdate: null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listCampaignsForClient(clientId: ObjectId): Promise<ClientCampaign[]> {
  const docs = await campaignsRepo.listByClientId(clientId);
  return docs.map(toClientCampaign);
}

// Ownership enforced via assertClientOwnership (Phase 16 §6).
export async function getCampaignForClient(campaignId: string, clientId: ObjectId): Promise<ClientCampaign | null> {
  if (!ObjectId.isValid(campaignId)) return null;
  const doc = await campaignsRepo.findById(new ObjectId(campaignId));
  const owned = assertClientOwnership(doc, clientId);
  return owned ? toClientCampaign(owned) : null;
}

// Admin-side creation (Phase 18 §2/§32) — same relationship validation as
// createProjectForAdmin: the target service engagement must be real and
// must actually belong to the given client before a campaign can be
// created under it.
export async function createCampaignForAdmin(
  input: {
    clientId: ObjectId;
    serviceEngagementId: ObjectId;
    name: string;
    platform?: string;
    objective?: string;
    status: ClientCampaignStatus;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    spend?: number;
  },
  actorUserId: ObjectId,
): Promise<ServiceResult<ClientCampaign>> {
  if (input.name.trim().length === 0) {
    return { ok: false, errors: ["Campaign name is required."] };
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    return { ok: false, errors: ["End date cannot be before the start date."] };
  }
  if (input.budget !== undefined && (Number.isNaN(input.budget) || input.budget < 0)) {
    return { ok: false, errors: ["Budget must be a non-negative number."] };
  }
  if (input.spend !== undefined && (Number.isNaN(input.spend) || input.spend < 0)) {
    return { ok: false, errors: ["Spend must be a non-negative number."] };
  }
  if (input.budget !== undefined && input.spend !== undefined && input.spend > input.budget) {
    return { ok: false, errors: ["Spend cannot exceed the campaign budget."] };
  }

  const engagement = await serviceEngagementsRepo.findById(input.serviceEngagementId);
  if (!engagement || !engagement.clientId.equals(input.clientId)) {
    return { ok: false, errors: ["Service engagement not found for this client."] };
  }

  const doc = await campaignsRepo.create({
    clientId: input.clientId,
    serviceEngagementId: engagement._id,
    serviceId: engagement.serviceId,
    name: input.name.trim(),
    platform: input.platform?.trim() || null,
    objective: input.objective?.trim() || null,
    status: input.status,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    budget: input.budget ?? null,
    spend: input.spend,
    createdByUserId: actorUserId,
  });

  return { ok: true, data: toClientCampaign(doc) };
}

// Admin-side status update (Phase 18 §5/§24) — transition graph
// authoritative, idempotent no-op on re-sending the current status, same
// as every other lifecycle in this codebase.
export async function updateCampaignStatusForAdmin(
  campaignId: ObjectId,
  nextStatus: ClientCampaignStatus,
  actorUserId: ObjectId,
): Promise<ServiceResult<ClientCampaign>> {
  const doc = await campaignsRepo.findById(campaignId);
  if (!doc) {
    return { ok: false, errors: ["Campaign not found."] };
  }
  if (doc.status === nextStatus) {
    return { ok: true, data: toClientCampaign(doc) };
  }
  if (!isValidCampaignTransition(doc.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a campaign from "${doc.status}" to "${nextStatus}".`] };
  }

  const updated = await campaignsRepo.updateStatus(doc._id, doc.status, nextStatus, actorUserId);
  if (!updated) {
    return { ok: false, errors: ["This campaign's status just changed. Refresh and try again."] };
  }
  return { ok: true, data: toClientCampaign(updated) };
}

// Admin-side budget/spend update (Phase 18 §9) — independent of status.
// Never allows spend to exceed budget unless the caller explicitly has no
// budget set yet (§15: "never allow spent > allocated unless the
// existing product requirements explicitly require overspend support" —
// this product doesn't, so it's rejected outright).
export async function updateCampaignFinancialsForAdmin(
  campaignId: ObjectId,
  fields: { budget?: number; spend?: number },
  actorUserId: ObjectId,
): Promise<ServiceResult<ClientCampaign>> {
  const doc = await campaignsRepo.findById(campaignId);
  if (!doc) {
    return { ok: false, errors: ["Campaign not found."] };
  }
  if (fields.budget !== undefined && (Number.isNaN(fields.budget) || fields.budget < 0)) {
    return { ok: false, errors: ["Budget must be a non-negative number."] };
  }
  if (fields.spend !== undefined && (Number.isNaN(fields.spend) || fields.spend < 0)) {
    return { ok: false, errors: ["Spend must be a non-negative number."] };
  }
  const effectiveBudget = fields.budget ?? doc.budget;
  const effectiveSpend = fields.spend ?? doc.spend;
  if (effectiveBudget !== null && effectiveSpend > effectiveBudget) {
    return { ok: false, errors: ["Spend cannot exceed the campaign budget."] };
  }

  const updated = await campaignsRepo.updateFinancials(doc._id, fields, actorUserId);
  if (!updated) {
    return { ok: false, errors: ["Campaign not found."] };
  }
  return { ok: true, data: toClientCampaign(updated) };
}
