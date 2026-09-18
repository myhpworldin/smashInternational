import "server-only";
import { ObjectId } from "mongodb";

import * as onboardingRepo from "@/server/repositories/onboarding.repo";
import * as assetsRepo from "@/server/repositories/onboarding-assets.repo";
import * as usersRepo from "@/server/repositories/users.repo";
import * as gridfs from "@/server/storage/gridfs";
import { uploadSmashAsset, deleteSmashAsset } from "@/server/storage/cloudinary";
import { notifyOnboardingSubmitted } from "@/server/notifications/onboarding-notifications";
import { generateAccessToken, readAccessToken } from "@/server/onboarding/access";
import { verifySession } from "@/server/auth/dal";
import { createEngagementsForApprovedOnboarding } from "@/server/services/serviceEngagements.service";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";
import {
  validateSelectedServiceIds,
  validateServiceResponses,
  validateForSubmission,
  type OnboardingDraftInput,
  type AssetMetadataInput,
} from "@/shared/validation/onboarding";
import type { OnboardingStatus, ReviewDecision } from "@/shared/types/onboarding";
import type { StatusHistoryRow } from "@/shared/types/statusHistory";

const ONBOARDING_STATUSES: readonly OnboardingStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "changes_requested",
];

function isOnboardingStatus(value: string): value is OnboardingStatus {
  return (ONBOARDING_STATUSES as readonly string[]).includes(value);
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// No login: the onboarding_access cookie is the only thing that ties a
// browser back to its draft. Proxy (src/proxy.ts) guarantees that cookie
// already exists — and is visible on this exact request, not just future
// ones — before either the page or any /api/onboarding route ever runs,
// so this only needs to resolve it, not issue it (see access.ts for why
// issuing a cookie can't happen here).
export async function getOrCreateAnonymousDraft(): Promise<OnboardingDoc> {
  const token = await readAccessToken();
  if (token) {
    const existing = await onboardingRepo.findByAccessToken(token);
    if (existing) return existing;
    // Cookie present but no matching record (e.g. the record was deleted
    // out of band) — create one under this same token rather than a new one.
    return onboardingRepo.createAnonymous(token);
  }

  // Defensive fallback only — every real request path is covered by
  // Proxy's matcher. A draft created here can't have its cookie set (this
  // runs during a Server Component render), so it won't survive a reload.
  return onboardingRepo.createAnonymous(generateAccessToken());
}

// The single place that decides "whose draft is this request for" — every
// client-facing onboarding route calls this instead of touching the
// session, the cookie, or a repo lookup directly, so there is exactly one
// place that identity logic can be gotten wrong rather than five.
//
// A logged-in client is identified by their session (userId -> the
// account's linked clientId), never by anything the browser could supply
// on the request itself (no onboardingId/clientId body field is ever
// accepted anywhere in this file). An anonymous visitor keeps working
// exactly as before Stage 2 (Phase 1-3 didn't touch this): the
// onboarding_access cookie alone.
//
// The two identities merge lazily: the first time a logged-in client's
// session reaches this function, whatever draft their current cookie
// points at (typically the one they were just filling out before they
// signed up) is "claimed" by writing its clientId onto their account —
// permanently, one time. From then on the session resolves straight to
// that clientId regardless of cookie/browser/device. A client with no
// draft yet (never visited /onboarding, or a stale/missing link) gets a
// fresh one, scoped to their account from creation.
export async function resolveOnboardingIdentity(): Promise<{ doc: OnboardingDoc; viaSession: boolean }> {
  const session = await verifySession();

  if (session?.role === "client") {
    const user = await usersRepo.findById(session.userId);
    if (user?.clientId) {
      const linked = await onboardingRepo.findByClientId(user.clientId);
      if (linked) return { doc: linked, viaSession: true };
      // Linked but the record itself is gone (deleted out of band) — fall
      // through and re-claim/create rather than leaving the account stuck.
    }

    const token = await readAccessToken();
    const rawDraft = token ? await onboardingRepo.findByAccessToken(token) : null;

    // A draft found via the anonymous cookie must never be claimed if
    // it's already linked to a *different* account — the cookie is
    // long-lived (1 year) and logout never clears it, so the same
    // browser previously used for another client's onboarding would
    // otherwise silently hand that client's data to this session instead
    // of starting a fresh draft for it.
    let draft = rawDraft;
    if (rawDraft) {
      const existingOwner = await usersRepo.findByOnboardingClientId(rawDraft.clientId);
      if (existingOwner && existingOwner._id.toHexString() !== session.userId) {
        draft = null;
      }
    }

    const claimed = draft ?? (await onboardingRepo.createAnonymous(generateAccessToken()));
    await usersRepo.setClientId(new ObjectId(session.userId), claimed.clientId);
    return { doc: claimed, viaSession: true };
  }

  return { doc: await getOrCreateAnonymousDraft(), viaSession: false };
}

// The caller (API route) must have already verified onboardingId belongs
// to this clientId's session — this function re-verifies via the repo's
// { _id, clientId } filter regardless, so a mismatched id is a silent no-op,
// never a leak into another client's record.
export async function saveDraft(
  onboardingId: ObjectId,
  clientId: ObjectId,
  patch: OnboardingDraftInput,
): Promise<ServiceResult<null>> {
  const errors: string[] = [];

  if (patch.selectedServiceIds) {
    errors.push(...validateSelectedServiceIds(patch.selectedServiceIds));
  }

  // Needed whenever selectedServiceIds or serviceResponses is part of this
  // patch — fetched once and reused for both.
  const needsExistingDoc = Boolean(patch.selectedServiceIds || patch.serviceResponses);
  const existing = needsExistingDoc ? await onboardingRepo.findById(onboardingId) : null;

  const effectiveSelectedIds = patch.selectedServiceIds ?? existing?.selectedServiceIds ?? [];

  if (patch.serviceResponses) {
    errors.push(...validateServiceResponses(effectiveSelectedIds, patch.serviceResponses));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  let finalPatch: OnboardingDraftInput = patch;

  // Server-side enforcement of "removed service -> its data is no longer an
  // active requirement" (never rely on the client to have pruned it): when
  // the selection changes, drop any stored response for a service that's no
  // longer selected, even if this patch didn't touch serviceResponses at all.
  if (patch.selectedServiceIds) {
    const selectedSet = new Set(patch.selectedServiceIds);
    const survivingResponses = (patch.serviceResponses ?? existing?.serviceResponses ?? []).filter(
      (r) => selectedSet.has(r.serviceId),
    );
    finalPatch = { ...patch, serviceResponses: survivingResponses };
  }

  const updated = await onboardingRepo.updateDraft(onboardingId, clientId, finalPatch);
  if (!updated) {
    return { ok: false, errors: ["Onboarding record not found, or it is no longer editable."] };
  }

  return { ok: true, data: null };
}

export async function submitDraft(
  onboardingId: ObjectId,
  clientId: ObjectId,
): Promise<ServiceResult<{ submittedAt: Date }>> {
  const doc = await onboardingRepo.findByClientId(clientId);
  if (!doc || !doc._id.equals(onboardingId)) {
    return { ok: false, errors: ["Onboarding record not found."] };
  }

  const errors = validateForSubmission({
    company: doc.company,
    objectives: doc.objectives,
    targetAudience: doc.targetAudience,
    selectedServiceIds: doc.selectedServiceIds,
    serviceResponses: doc.serviceResponses,
    budget: doc.budget,
    brandProfile: doc.brandProfile,
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // A single updateOne on one document, guarded by a status filter
  // (draft/changes_requested only) — atomic by construction, no multi-
  // document transaction needed: either this exact write applies (moving
  // status and submittedAt together) or it doesn't, and a concurrent
  // second attempt (double-click, retried timeout) simply doesn't match
  // the filter a second time, so it never creates a duplicate submission.
  const submittedAt = await onboardingRepo.submit(onboardingId, clientId);
  if (!submittedAt) {
    return { ok: false, errors: ["Onboarding record is not in a submittable state."] };
  }

  // Phase 4 §10/§11: this write covers both a first-time submission
  // (draft -> submitted) and a client resubmission after changes were
  // requested (changes_requested -> submitted) — doc.status, captured
  // before the write above, is whichever of those actually applied.
  // Session-derived actor only (never trust a request-supplied id): the
  // caller (the submit API route) already confirmed viaSession is true
  // before reaching here, so a real session is guaranteed to exist.
  const session = await verifySession();
  if (session) {
    await statusHistoryRepo.record({
      entityType: "onboarding",
      entityId: onboardingId,
      clientId,
      previousStatus: doc.status,
      newStatus: "submitted",
      changedByUserId: new ObjectId(session.userId),
      changedByRole: session.role,
    });
  }

  await notifyOnboardingSubmitted({ ...doc, status: "submitted", submittedAt });

  return { ok: true, data: { submittedAt } };
}

// Uploads the actual bytes to GridFS, then records the metadata. The
// caller has already validated metadata (type/size/allowed-mime). These
// are two separate writes with no shared transaction (GridFS and a normal
// collection can't share one here), so if the metadata insert fails after
// the bytes already landed, the file would otherwise be orphaned — bytes
// in storage that nothing ever references again. The catch below cleans
// that up on a best-effort basis rather than leaving it to accumulate.
export async function addAsset(
  onboardingId: ObjectId,
  clientId: ObjectId,
  uploadedByUserId: ObjectId | null,
  metadata: AssetMetadataInput,
  buffer: Buffer,
) {
  const fileId = await gridfs.uploadBuffer(buffer, metadata.originalFilename);

  // Dual-write to Cloudinary (SMASH's smash-crm/{env}/{category} structure —
  // see server/storage/cloudinary.ts) alongside the existing GridFS storage.
  // GridFS is, and remains, the source of truth: a Cloudinary failure here
  // is logged and swallowed rather than failing the upload — the asset is
  // still fully usable (stored, listed, served, deleted) without it, exactly
  // as before this change. This is additive; nothing existing is weakened.
  let cloudinaryResult: Awaited<ReturnType<typeof uploadSmashAsset>> | null = null;
  try {
    cloudinaryResult = await uploadSmashAsset({
      buffer,
      assetType: metadata.assetType,
      onboardingId: onboardingId.toHexString(),
    });
  } catch (err) {
    console.error("[onboarding.addAsset] Cloudinary dual-write failed (GridFS copy is unaffected):", err);
  }

  try {
    return await assetsRepo.create({
      onboardingId,
      clientId,
      uploadedByUserId,
      assetType: metadata.assetType,
      originalFilename: metadata.originalFilename,
      fileId,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      ...(cloudinaryResult && {
        cloudinaryPublicId: cloudinaryResult.publicId,
        cloudinarySecureUrl: cloudinaryResult.secureUrl,
        cloudinaryResourceType: cloudinaryResult.resourceType,
      }),
    });
  } catch (err) {
    await gridfs.deleteFile(fileId).catch(() => null);
    if (cloudinaryResult) {
      await deleteSmashAsset(cloudinaryResult.publicId, cloudinaryResult.resourceType).catch(() => null);
    }
    throw err;
  }
}

export async function listAssets(onboardingId: ObjectId) {
  return assetsRepo.listByOnboardingId(onboardingId);
}

// The caller (API route) supplies the full desired order as a list of
// asset ids — validated here against what this onboarding actually owns
// before being applied, so a stale or tampered id list can't silently
// drop, duplicate, or reach into another record's assets.
export async function reorderAssets(
  onboardingId: ObjectId,
  clientId: ObjectId,
  assetIds: ObjectId[],
): Promise<ServiceResult<null>> {
  const existing = await assetsRepo.listByOnboardingId(onboardingId);
  const existingIds = new Set(existing.map((a) => a._id.toHexString()));
  const requestedIds = assetIds.map((id) => id.toHexString());

  const sameSet =
    existing.length === assetIds.length &&
    requestedIds.every((id) => existingIds.has(id)) &&
    new Set(requestedIds).size === requestedIds.length;

  if (!sameSet) {
    return { ok: false, errors: ["The file list has changed — refresh and try again."] };
  }

  await assetsRepo.reorder(onboardingId, clientId, assetIds);
  return { ok: true, data: null };
}

export async function getAssetById(assetId: ObjectId) {
  return assetsRepo.findById(assetId);
}

// Deletes the metadata row (scoped to the owning client — a mismatch is a
// silent no-op, not a leak) and, only once that succeeds, the GridFS bytes.
export async function deleteAsset(assetId: ObjectId, clientId: ObjectId): Promise<boolean> {
  const deleted = await assetsRepo.deleteOwnedByClient(assetId, clientId);
  if (!deleted) return false;

  await gridfs.deleteFile(deleted.fileId);

  // Scoped to this exact asset's own public_id — never a folder/bulk
  // operation, and only runs at all for assets that actually have a
  // Cloudinary copy (older assets, or ones where the dual-write failed at
  // upload time, simply have nothing to delete here).
  if (deleted.cloudinaryPublicId && deleted.cloudinaryResourceType) {
    await deleteSmashAsset(deleted.cloudinaryPublicId, deleted.cloudinaryResourceType).catch((err) => {
      console.error("[onboarding.deleteAsset] Cloudinary delete failed (GridFS copy was still removed):", err);
    });
  }

  return true;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function listForAdmin(params: {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const filter = {
    status: params.status && isOnboardingStatus(params.status) ? params.status : undefined,
    q: params.q,
  };

  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page ?? 1, 1);

  const { records, total } = await onboardingRepo.listForAdmin(filter, {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  return { records, total, page, pageSize };
}

export async function getAdminStatusCounts(): Promise<Record<OnboardingStatus, number>> {
  const counts = await onboardingRepo.countByStatus();
  return {
    draft: counts.draft ?? 0,
    submitted: counts.submitted ?? 0,
    under_review: counts.under_review ?? 0,
    approved: counts.approved ?? 0,
    changes_requested: counts.changes_requested ?? 0,
  };
}

// Viewing the detail page is what moves a record from "submitted" (not yet
// opened) to "under_review" (an admin is looking at it) — this is the only
// place that transition happens, since reviewSubmission's final decision
// no longer needs to also perform it (see that function).
export async function getForAdmin(onboardingId: ObjectId, viewedByUserId: ObjectId) {
  const transitioned = await onboardingRepo.markUnderReview(onboardingId);
  const doc = await onboardingRepo.findById(onboardingId);
  if (!doc) return null;

  // Phase 4 §11 — only logged when this exact call is the one that
  // actually flipped the status (markUnderReview's own status filter means
  // a later page view, with the record already at under_review, returns
  // false here and correctly logs nothing).
  if (transitioned) {
    await statusHistoryRepo.record({
      entityType: "onboarding",
      entityId: onboardingId,
      clientId: doc.clientId,
      previousStatus: "submitted",
      newStatus: "under_review",
      changedByUserId: viewedByUserId,
      changedByRole: "admin",
    });
  }

  const reviewedByEmail = doc.review.reviewedByUserId
    ? (await usersRepo.findById(doc.review.reviewedByUserId.toHexString()))?.email ?? null
    : null;

  return { ...doc, review: { ...doc.review, reviewedByEmail } };
}

// Phase 4 §11/§22 — the admin-visible transition log for one onboarding
// record. Actor emails are resolved per-entry the same way
// getForAdmin resolves reviewedByEmail; this list is expected to stay
// short (a handful of transitions per onboarding), so N lookups here
// isn't the N+1 concern §30 warns about for list-of-many endpoints.
export async function getOnboardingStatusHistory(onboardingId: ObjectId): Promise<StatusHistoryRow[]> {
  const entries = await statusHistoryRepo.listByEntity("onboarding", onboardingId);
  return Promise.all(
    entries.map(async (entry) => ({
      id: entry._id.toHexString(),
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      changedByEmail: (await usersRepo.findById(entry.changedByUserId.toHexString()))?.email ?? "Unknown",
      changedByRole: entry.changedByRole,
      reason: entry.reason,
      changedAt: entry.changedAt.toISOString(),
    })),
  );
}

export async function reviewSubmission(
  onboardingId: ObjectId,
  reviewedByUserId: ObjectId,
  decision: ReviewDecision,
  notes: string | null,
): Promise<ServiceResult<null>> {
  // Captured before either write below, so the history entry logged after
  // a successful review() reflects what the status actually was going
  // into this decision (almost always "under_review" by the time an admin
  // reaches this action, since opening the detail page already moved it
  // there via getForAdmin — but this call is defensive of that ordering,
  // not dependent on it).
  const before = await onboardingRepo.findById(onboardingId);
  if (!before) {
    return { ok: false, errors: ["Onboarding record not found."] };
  }

  await onboardingRepo.markUnderReview(onboardingId);

  const reviewed = await onboardingRepo.review(onboardingId, reviewedByUserId, decision, notes);
  if (!reviewed) {
    return { ok: false, errors: ["Onboarding record is not awaiting review."] };
  }

  const newStatus: OnboardingStatus = decision === "approved" ? "approved" : "changes_requested";
  await statusHistoryRepo.record({
    entityType: "onboarding",
    entityId: onboardingId,
    clientId: before.clientId,
    previousStatus: before.status === "draft" ? "submitted" : before.status,
    newStatus,
    changedByUserId: reviewedByUserId,
    changedByRole: "admin",
    reason: notes,
  });

  // Stage 1 Phase 3: an approval is the moment each selected service turns
  // into a real, independently-tracked service engagement.
  // createEngagementsForApprovedOnboarding is itself idempotent, so a
  // retried review request (network retry, etc.) never creates
  // duplicates — safe to call unconditionally on every approval. Reuses
  // `before` rather than re-fetching: review() only ever touches
  // status/review/updatedAt, never clientId/selectedServiceIds.
  if (decision === "approved") {
    await createEngagementsForApprovedOnboarding(before, reviewedByUserId);
  }

  return { ok: true, data: null };
}
