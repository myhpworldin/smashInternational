import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import * as budgetsRepo from "@/server/repositories/budgets.repo";
import type { BudgetDoc } from "@/server/repositories/budgets.repo";
import * as budgetChangeRequestsRepo from "@/server/repositories/budgetChangeRequests.repo";
import type { BudgetChangeRequestDoc } from "@/server/repositories/budgetChangeRequests.repo";
import type { BudgetSnapshot, BudgetChangeRequest } from "@/shared/types/budget";

// Stage 1 Phase 18 — real persistence, replacing the Phase 12 stub. Same
// BudgetSnapshot/BudgetChangeRequest shapes the frontend already
// consumes; no page or component needs to change for this to take effect.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function toSnapshot(doc: BudgetDoc): BudgetSnapshot {
  const allocations = doc.allocations.map((a) => ({
    id: a.id,
    name: a.name,
    allocated: a.allocated,
    spent: a.spent,
    remaining: Math.max(a.allocated - a.spent, 0),
  }));
  const spent = allocations.reduce((sum, a) => sum + a.spent, 0);
  return {
    periodLabel: doc.periodLabel,
    total: doc.total,
    allocated: allocations.reduce((sum, a) => sum + a.allocated, 0),
    spent,
    remaining: Math.max(doc.total - spent, 0),
    allocations,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toRequestRow(doc: BudgetChangeRequestDoc): BudgetChangeRequest {
  return {
    id: doc._id.toHexString(),
    channelName: doc.channelName ?? undefined,
    campaignName: doc.campaignName ?? undefined,
    currentAllocation: doc.currentAllocation,
    requestedAllocation: doc.requestedAllocation,
    reason: doc.reason,
    status: doc.status,
    requestedAt: doc.requestedAt.toISOString(),
  };
}

export async function getBudgetForClient(clientId: ObjectId): Promise<BudgetSnapshot | null> {
  const doc = await budgetsRepo.findLatestForClient(clientId);
  return doc ? toSnapshot(doc) : null;
}

export async function listBudgetRequestsForClient(clientId: ObjectId): Promise<BudgetChangeRequest[]> {
  const docs = await budgetChangeRequestsRepo.listByClientId(clientId);
  return docs.map(toRequestRow);
}

// Admin-side: set/update the current period's total budget (Phase 18
// §11/§19). Allocation-level editing has no admin UI yet (Phase 13 only
// built a total-budget editor) — the model already supports it via
// budgets.repo.ts's setAllocationAmount for whichever future phase adds
// that control.
export async function setBudgetTotalForAdmin(
  clientId: ObjectId,
  total: number,
  actorUserId: ObjectId,
): Promise<ServiceResult<BudgetSnapshot>> {
  if (Number.isNaN(total) || total < 0) {
    return { ok: false, errors: ["Total budget must be a non-negative number."] };
  }
  const doc = await budgetsRepo.upsertTotal(clientId, budgetsRepo.currentPeriod(), total, actorUserId);
  return { ok: true, data: toSnapshot(doc) };
}

// Admin-side: set the total budget AND every per-service allocation in one
// save (the per-service allocation editor added alongside setBudgetTotalForAdmin's
// original total-only editor) — `allocations` is always the client's
// complete current set of rows (one per live service engagement), so this
// replaces the whole list rather than patching one entry at a time. The
// "allocated can't exceed total" rule is enforced here too, not only by
// the request schema, since this function has no other caller yet but
// shouldn't rely on that staying true.
export async function setBudgetAllocationsForAdmin(
  clientId: ObjectId,
  input: { total: number; allocations: { id: string; name: string; allocated: number }[] },
  actorUserId: ObjectId,
): Promise<ServiceResult<BudgetSnapshot>> {
  if (Number.isNaN(input.total) || input.total < 0) {
    return { ok: false, errors: ["Total budget must be a non-negative number."] };
  }

  for (const allocation of input.allocations) {
    if (Number.isNaN(allocation.allocated) || allocation.allocated < 0) {
      return { ok: false, errors: [`The amount for ${allocation.name} must be a non-negative number.`] };
    }
  }

  const totalAllocated = input.allocations.reduce((sum, a) => sum + a.allocated, 0);
  if (totalAllocated > input.total) {
    return { ok: false, errors: ["Allocated amounts can't exceed the total budget."] };
  }

  const doc = await budgetsRepo.upsertTotal(clientId, budgetsRepo.currentPeriod(), input.total, actorUserId);
  await budgetsRepo.replaceAllocations(doc._id, input.allocations);

  // Guaranteed to exist — upsertTotal just created/confirmed this exact
  // document and replaceAllocations wrote to that same _id immediately
  // after, same non-null reasoning upsertTotal's own findOneAndUpdate uses.
  const updated = await budgetsRepo.findByClientAndPeriod(clientId, budgetsRepo.currentPeriod().key);
  return { ok: true, data: toSnapshot(updated!) };
}

// Client-side: submit a budget change request (Phase 18 §20, reused by
// Phase 12's client-facing form). `currentAllocation` is always resolved
// here from the client's real, current budget — never trusted from the
// request body — so a request can't misrepresent its own baseline (which
// would otherwise let a later approval apply a change against a false
// "before" value).
export async function submitBudgetChangeRequestForClient(
  clientId: ObjectId,
  input: { channelName?: string; campaignName?: string; requestedAllocation: number; reason: string },
  actorUserId: ObjectId,
): Promise<ServiceResult<BudgetChangeRequest>> {
  if (Number.isNaN(input.requestedAllocation) || input.requestedAllocation < 0) {
    return { ok: false, errors: ["Requested allocation must be a non-negative number."] };
  }
  if (input.reason.trim().length === 0) {
    return { ok: false, errors: ["Enter a reason for this request."] };
  }

  const budget = await budgetsRepo.findLatestForClient(clientId);
  const currentAllocation = input.channelName
    ? (budget?.allocations.find((a) => a.name === input.channelName)?.allocated ?? 0)
    : (budget?.total ?? 0);

  const doc = await budgetChangeRequestsRepo.create({
    clientId,
    channelName: input.channelName ?? null,
    campaignName: input.campaignName ?? null,
    currentAllocation,
    requestedAllocation: input.requestedAllocation,
    reason: input.reason.trim(),
    requestedByUserId: actorUserId,
  });

  return { ok: true, data: toRequestRow(doc) };
}

// Admin-side: reject a pending request. No financial change to apply, so
// no staleness check is needed — only the double-processing guard
// (repo's `status: "pending"` filter).
export async function rejectBudgetChangeRequest(
  requestId: ObjectId,
  actorUserId: ObjectId,
  reviewNote?: string,
): Promise<ServiceResult<BudgetChangeRequest>> {
  const updated = await budgetChangeRequestsRepo.updateStatus(requestId, "rejected", actorUserId, reviewNote ?? null);
  if (!updated) {
    return { ok: false, errors: ["This request is no longer pending."] };
  }
  return { ok: true, data: toRequestRow(updated) };
}

// Admin-side: approve a pending request and apply it to the live budget
// (Phase 18 §22/§23/§25) — all in one transaction, so the budget and the
// request's own status can never end up disagreeing about whether the
// change was applied.
//
// Staleness protection (§25): the request's frozen `currentAllocation` is
// compared against the budget's live value for that same channel/total
// right before writing. If they've diverged — an admin independently
// changed the allocation after the client submitted this request — the
// approval is refused rather than blindly overwriting newer state with
// a request based on stale numbers.
export async function approveBudgetChangeRequest(
  requestId: ObjectId,
  actorUserId: ObjectId,
  reviewNote?: string,
): Promise<ServiceResult<BudgetChangeRequest>> {
  const client = await getMongoClient();
  const session = client.startSession();
  let outcome: ServiceResult<BudgetChangeRequest> = { ok: false, errors: ["Approval did not complete."] };

  try {
    await session.withTransaction(async () => {
      const request = await budgetChangeRequestsRepo.findById(requestId, session);
      if (!request || request.status !== "pending") {
        outcome = { ok: false, errors: ["This request is no longer pending."] };
        throw new Error("REQUEST_NOT_PENDING");
      }

      const budget = await budgetsRepo.findByClientAndPeriod(request.clientId, budgetsRepo.currentPeriod().key, session);
      const liveValue = request.channelName
        ? (budget?.allocations.find((a) => a.name === request.channelName)?.allocated ?? 0)
        : (budget?.total ?? 0);

      if (liveValue !== request.currentAllocation) {
        outcome = {
          ok: false,
          errors: ["The current budget has changed since this request was submitted. Ask the client to resubmit."],
        };
        throw new Error("STALE_REQUEST");
      }

      let targetBudgetId = budget?._id;
      if (!targetBudgetId) {
        const created = await budgetsRepo.upsertTotal(
          request.clientId,
          budgetsRepo.currentPeriod(),
          request.channelName ? 0 : request.requestedAllocation,
          actorUserId,
        );
        targetBudgetId = created._id;
      }

      if (request.channelName) {
        await budgetsRepo.setAllocationAmount(targetBudgetId, request.channelName, request.requestedAllocation, session);
      } else {
        await budgetsRepo.setTotalAmount(targetBudgetId, request.requestedAllocation, session);
      }

      const updatedRequest = await budgetChangeRequestsRepo.updateStatus(
        requestId,
        "approved",
        actorUserId,
        reviewNote ?? null,
        session,
      );
      if (!updatedRequest) {
        outcome = { ok: false, errors: ["This request is no longer pending."] };
        throw new Error("REQUEST_NOT_PENDING");
      }

      outcome = { ok: true, data: toRequestRow(updatedRequest) };
    });
  } catch (error) {
    if (!(error instanceof Error) || !["REQUEST_NOT_PENDING", "STALE_REQUEST"].includes(error.message)) {
      console.error("[budget.service] approveBudgetChangeRequest failed:", error);
      outcome = { ok: false, errors: ["Something went wrong applying this approval. Try again."] };
    }
  } finally {
    await session.endSession();
  }

  return outcome;
}
