import "server-only";
import { ObjectId } from "mongodb";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import type { ServiceEngagementDoc } from "@/server/repositories/serviceEngagements.repo";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import { getServiceById, isValidServiceId } from "@/shared/config/services";
import { assertClientOwnership } from "@/server/auth/ownership";
import { isValidEngagementTransition, type ServiceEngagementRow, type ServiceEngagementStatus } from "@/shared/types/serviceEngagement";

// Same shape as onboarding.service.ts's ServiceResult — defined again
// here rather than imported from there, since that file imports this one
// (createEngagementsForApprovedOnboarding) and a cross-import the other
// way would create a cycle.
type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function toRow(doc: ServiceEngagementDoc): ServiceEngagementRow {
  return {
    id: doc._id.toHexString(),
    serviceId: doc.serviceId,
    serviceLabel: getServiceById(doc.serviceId)?.label ?? doc.serviceId,
    status: doc.status,
    sourceOnboardingId: doc.sourceOnboardingId.toHexString(),
    requestedAt: doc.requestedAt.toISOString(),
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    activatedAt: doc.activatedAt ? doc.activatedAt.toISOString() : null,
    pausedAt: doc.pausedAt ? doc.pausedAt.toISOString() : null,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  };
}

// The one place selected onboarding services turn into operational
// records (Phase 3 §14) — called from reviewSubmission() the moment an
// onboarding is approved, never from anywhere that trusts a
// client-supplied service list. Idempotent (§13): a retried approval
// call (network retry, double-click before the button disabled, etc.)
// re-resolves to the same "already exists" outcome per service instead of
// creating duplicates — findLiveByClientAndService is checked immediately
// before each insert, matching the same check-then-insert pattern already
// accepted elsewhere in this codebase (serviceAssignments.repo.ts's
// findLiveByOnboardingAndService), not a stronger unique-index guarantee.
// An unrecognized serviceId (stale catalog entry, corrupted data) is
// skipped rather than trusted — never invented as a new canonical service.
export async function createEngagementsForApprovedOnboarding(
  doc: Pick<OnboardingDoc, "_id" | "clientId" | "selectedServiceIds">,
  approvedByUserId: ObjectId,
): Promise<{ created: ServiceEngagementRow[]; skippedInvalidServiceIds: string[] }> {
  const created: ServiceEngagementRow[] = [];
  const skippedInvalidServiceIds: string[] = [];

  for (const serviceId of doc.selectedServiceIds) {
    if (!isValidServiceId(serviceId)) {
      skippedInvalidServiceIds.push(serviceId);
      continue;
    }

    const existing = await serviceEngagementsRepo.findLiveByClientAndService(doc.clientId, serviceId);
    if (existing) continue;

    const engagement = await serviceEngagementsRepo.create({
      clientId: doc.clientId,
      serviceId,
      sourceOnboardingId: doc._id,
      status: "approved",
    });
    created.push(toRow(engagement));

    // Phase 4 §11 — every important transition is recorded, including the
    // engagement's own birth (null -> approved), not just later admin-driven
    // moves.
    await statusHistoryRepo.record({
      entityType: "service_engagement",
      entityId: engagement._id,
      clientId: doc.clientId,
      previousStatus: null,
      newStatus: "approved",
      changedByUserId: approvedByUserId,
      changedByRole: "admin",
      reason: "Onboarding approved.",
    });
  }

  if (skippedInvalidServiceIds.length > 0) {
    console.error(
      `[serviceEngagements] onboarding ${doc._id.toHexString()} selected unrecognized service id(s), skipped:`,
      skippedInvalidServiceIds,
    );
  }

  return { created, skippedInvalidServiceIds };
}

// Session-derived only (Phase 3 §19) — the caller passes the clientId
// already resolved from the authenticated user's own session (see
// getAuthorizedClient in dal.ts), never anything the request itself
// supplied. This is the one function both the client-facing read API and
// a future dashboard "My Services" section should call.
export async function listEngagementsForClient(clientId: ObjectId): Promise<ServiceEngagementRow[]> {
  const docs = await serviceEngagementsRepo.listByClientId(clientId);
  return docs.map(toRow);
}

// Stage 1 Phase 5 — the service-detail page's single lookup. Ownership is
// enforced here, not left to the caller: a service engagement id is a
// guessable ObjectId, so returning null for one that exists but belongs to
// a different client (rather than the row itself) is what actually
// prevents Client A from reading Client B's engagement by URL (Phase 3
// §19 applied to a single-record lookup, not just the list one).
export async function getEngagementForClient(
  engagementId: ObjectId,
  clientId: ObjectId,
): Promise<ServiceEngagementRow | null> {
  const doc = await serviceEngagementsRepo.findById(engagementId);
  const owned = assertClientOwnership(doc, clientId);
  return owned ? toRow(owned) : null;
}

// Admin-side equivalent for the onboarding detail page — same row shape,
// scoped by the onboarding record that originated these engagements
// instead of by client, since that's what that page already has on hand.
export async function listEngagementsForOnboarding(onboardingId: ObjectId): Promise<ServiceEngagementRow[]> {
  const docs = await serviceEngagementsRepo.listBySourceOnboardingId(onboardingId);
  return docs.map(toRow);
}

const ACTIVATION_TIMESTAMP_FIELD: Partial<Record<ServiceEngagementStatus, "activatedAt" | "pausedAt" | "completedAt">> = {
  active: "activatedAt",
  paused: "pausedAt",
  completed: "completedAt",
};

// The one write path for moving a service engagement through its
// lifecycle (Phase 4 §12-14) — admin-only (enforced by the caller, the API
// route, via getAuthorizedAdmin), and the only place that ever changes an
// engagement's status after creation. Every rule from §14/§21/§28 lives
// here, not scattered across callers:
//   - the transition graph is authoritative (isValidEngagementTransition);
//     an invalid one (e.g. completed -> active) is rejected with a clear
//     error rather than silently applied or thrown as an exception.
//   - re-sending the current status is a safe no-op (§21: a double-click
//     or retried request must not corrupt history or write a duplicate
//     status-history entry for a transition that didn't actually happen).
//   - the relevant lifecycle timestamp (activatedAt/pausedAt/completedAt)
//     is set server-side, from server time, never trusted from the caller.
export async function updateEngagementStatus(
  engagementId: ObjectId,
  actor: Pick<UserDoc, "_id" | "role">,
  nextStatus: ServiceEngagementStatus,
  reason: string | null,
): Promise<ServiceResult<ServiceEngagementRow>> {
  const doc = await serviceEngagementsRepo.findById(engagementId);
  if (!doc) {
    return { ok: false, errors: ["Service engagement not found."] };
  }

  if (doc.status === nextStatus) {
    return { ok: true, data: toRow(doc) };
  }

  if (!isValidEngagementTransition(doc.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a service from "${doc.status}" to "${nextStatus}".`] };
  }

  const now = new Date();
  const timestampField = ACTIVATION_TIMESTAMP_FIELD[nextStatus];
  const updated = await serviceEngagementsRepo.updateStatus(doc._id, doc.status, nextStatus, {
    ...(timestampField ? { [timestampField]: now } : {}),
  });

  if (!updated) {
    // Someone else's request changed this engagement's status between the
    // read above and this write (concurrent admin action) — the doc.status
    // guard on the update means this never silently overwrites a status
    // this call didn't actually observe.
    return { ok: false, errors: ["This service's status just changed. Refresh and try again."] };
  }

  await statusHistoryRepo.record({
    entityType: "service_engagement",
    entityId: doc._id,
    clientId: doc.clientId,
    previousStatus: doc.status,
    newStatus: nextStatus,
    changedByUserId: actor._id,
    changedByRole: actor.role,
    reason,
  });

  return { ok: true, data: toRow(updated) };
}
