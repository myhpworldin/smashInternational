import "server-only";
import { ObjectId } from "mongodb";

import * as onboardingRepo from "@/server/repositories/onboarding.repo";
import * as assetsRepo from "@/server/repositories/onboarding-assets.repo";
import * as usersRepo from "@/server/repositories/users.repo";
import * as gridfs from "@/server/storage/gridfs";
import { notifyOnboardingSubmitted } from "@/server/notifications/onboarding-notifications";
import { generateAccessToken, readAccessToken } from "@/server/onboarding/access";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";
import {
  validateSelectedServiceIds,
  validateServiceResponses,
  validateForSubmission,
  type OnboardingDraftInput,
  type AssetMetadataInput,
} from "@/shared/validation/onboarding";
import type { OnboardingStatus, ReviewDecision } from "@/shared/types/onboarding";

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
    });
  } catch (err) {
    await gridfs.deleteFile(fileId).catch(() => null);
    throw err;
  }
}

export async function listAssets(onboardingId: ObjectId) {
  return assetsRepo.listByOnboardingId(onboardingId);
}

export async function getAssetById(assetId: ObjectId) {
  return assetsRepo.findById(assetId);
}

// Read-only lookup — unlike getOrCreateAnonymousDraft, this never creates a
// record for a missing/invalid token. Used only to check "does this
// visitor's cookie map to the client that owns this asset" before serving
// a file; a token that doesn't resolve should mean unauthorized, not a
// silently-created fresh draft.
export async function getDraftByAccessToken(token: string) {
  return onboardingRepo.findByAccessToken(token);
}

// Deletes the metadata row (scoped to the owning client — a mismatch is a
// silent no-op, not a leak) and, only once that succeeds, the GridFS bytes.
export async function deleteAsset(assetId: ObjectId, clientId: ObjectId): Promise<boolean> {
  const deleted = await assetsRepo.deleteOwnedByClient(assetId, clientId);
  if (!deleted) return false;

  await gridfs.deleteFile(deleted.fileId);
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

// Viewing the detail page is what moves a record from "submitted" (not yet
// opened) to "under_review" (an admin is looking at it) — this is the only
// place that transition happens, since reviewSubmission's final decision
// no longer needs to also perform it (see that function).
export async function getForAdmin(onboardingId: ObjectId) {
  await onboardingRepo.markUnderReview(onboardingId);
  const doc = await onboardingRepo.findById(onboardingId);
  if (!doc) return null;

  const reviewedByEmail = doc.review.reviewedByUserId
    ? (await usersRepo.findById(doc.review.reviewedByUserId.toHexString()))?.email ?? null
    : null;

  return { ...doc, review: { ...doc.review, reviewedByEmail } };
}

export async function reviewSubmission(
  onboardingId: ObjectId,
  reviewedByUserId: ObjectId,
  decision: ReviewDecision,
  notes: string | null,
): Promise<ServiceResult<null>> {
  await onboardingRepo.markUnderReview(onboardingId);

  const reviewed = await onboardingRepo.review(onboardingId, reviewedByUserId, decision, notes);
  if (!reviewed) {
    return { ok: false, errors: ["Onboarding record is not awaiting review."] };
  }

  return { ok: true, data: null };
}
