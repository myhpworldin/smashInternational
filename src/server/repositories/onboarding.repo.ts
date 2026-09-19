import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { OnboardingStatus, ReviewDecision } from "@/shared/types/onboarding";
import type { Role } from "@/shared/types/user";

const COLLECTION = "onboarding";

export type ServiceResponseDoc = { serviceId: string; responses: Record<string, unknown> };

export type OnboardingDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  // The credential for the public, no-login onboarding flow — see
  // server/onboarding/access.ts. Unique per record.
  accessToken: string;
  // Null for the no-login flow and for a client's own self-service
  // onboarding — set to the admin's user id only by createForAdmin below
  // (Stage 1 Phase 29: admin-assisted onboarding). This doubles as the
  // record's "submission mode" — never a separate stored field, since
  // createdByUserId already says everything "was this admin-assisted"
  // needs to (non-null = admin-assisted, null = client-initiated) without
  // two fields that could theoretically disagree.
  createdByUserId: ObjectId | null;
  // Who most recently wrote to this draft (a save or the final submit) and
  // in what role — distinct from createdByUserId (who started the
  // record): a client can keep editing a draft an admin started, and an
  // admin can resume one a client started, so "who created it" and "who
  // last touched it" can genuinely differ. Null until the first write
  // ever made through an authenticated session (an anonymous visitor's
  // own edits have no session to attribute them to).
  lastEditedByUserId: ObjectId | null;
  lastEditedByRole: Role | null;
  status: OnboardingStatus;
  company: Record<string, unknown> | null;
  objectives: Record<string, unknown> | null;
  targetAudience: Record<string, unknown> | null;
  selectedServiceIds: string[];
  serviceResponses: ServiceResponseDoc[];
  budget: Record<string, unknown> | null;
  brandProfile: Record<string, unknown> | null;
  submittedAt: Date | null;
  review: {
    reviewedByUserId: ObjectId | null;
    reviewedAt: Date | null;
    decision: ReviewDecision | null;
    notes: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<OnboardingDoc>(COLLECTION);
}

function emptyDoc(clientId: ObjectId, accessToken: string, createdByUserId: ObjectId | null = null): OnboardingDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    clientId,
    accessToken,
    createdByUserId,
    lastEditedByUserId: null,
    lastEditedByRole: null,
    status: "draft",
    company: null,
    objectives: null,
    targetAudience: null,
    selectedServiceIds: [],
    serviceResponses: [],
    budget: null,
    brandProfile: null,
    submittedAt: null,
    review: { reviewedByUserId: null, reviewedAt: null, decision: null, notes: null },
    createdAt: now,
    updatedAt: now,
  };
}

export async function findByClientId(clientId: ObjectId): Promise<OnboardingDoc | null> {
  return (await collection()).findOne({ clientId });
}

// Bulk counterpart of findByClientId, for a caller resolving many clients
// at once (adminUsers.service.ts's user list uses this to fall back to a
// client's onboarding contact name — see toAdminUserRow) rather than
// issuing one query per row.
export async function findByClientIds(clientIds: ObjectId[]): Promise<OnboardingDoc[]> {
  if (clientIds.length === 0) return [];
  return (await collection()).find({ clientId: { $in: clientIds } }).toArray();
}

export async function findByAccessToken(token: string): Promise<OnboardingDoc | null> {
  return (await collection()).findOne({ accessToken: token });
}

export async function findById(id: ObjectId): Promise<OnboardingDoc | null> {
  return (await collection()).findOne({ _id: id });
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

// Creates a brand-new onboarding record for a first-time visitor, keyed by
// the access token that was (or is about to be) set in their cookie — see
// server/onboarding/access.ts. clientId is a fresh synthetic id purely to
// keep the existing per-record uniqueness/indexing shape; there is no
// separate client/account record behind it.
export async function createAnonymous(accessToken: string): Promise<OnboardingDoc> {
  const doc = emptyDoc(new ObjectId(), accessToken);
  try {
    await (await collection()).insertOne(doc);
    return doc;
  } catch (err) {
    // Vanishingly unlikely (a 256-bit token colliding), but if the unique
    // index on accessToken ever rejected an insert, re-reading by token
    // fails safe rather than crashing the request.
    if (isDuplicateKeyError(err)) {
      const existing = await findByAccessToken(accessToken);
      if (existing) return existing;
    }
    throw err;
  }
}

// Stage 1 Phase 29: the admin-assisted counterpart of createAnonymous —
// same empty-draft shape, but keyed by a fresh synthetic clientId the
// caller (resolveOnboardingForAdmin in onboarding.service.ts) immediately
// links onto the target client's user account via usersRepo.setClientId,
// rather than a cookie. accessToken is still generated and stored (the
// schema requires one, and it keeps this row structurally identical to
// every other onboarding document) even though nothing ever reaches this
// record through the anonymous cookie flow.
export async function createForAdmin(
  clientId: ObjectId,
  accessToken: string,
  createdByUserId: ObjectId,
): Promise<OnboardingDoc> {
  const doc = emptyDoc(clientId, accessToken, createdByUserId);
  await (await collection()).insertOne(doc);
  return doc;
}

export type DraftPatch = Partial<
  Pick<
    OnboardingDoc,
    "company" | "objectives" | "targetAudience" | "selectedServiceIds" | "serviceResponses" | "budget" | "brandProfile"
  >
>;

export type EditorActor = { userId: ObjectId; role: Role };

// Only permitted while the record is still a draft or kicked back for
// changes — a submitted/under_review/approved record is not editable here.
// `editor` is omitted for the anonymous, no-login flow (there is no
// session to attribute the edit to); when present (a logged-in client or
// an admin acting on their behalf) it stamps lastEditedByUserId/Role so
// the record always reflects who most recently touched it.
export async function updateDraft(
  onboardingId: ObjectId,
  clientId: ObjectId,
  patch: DraftPatch,
  editor?: EditorActor,
): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { _id: onboardingId, clientId, status: { $in: ["draft", "changes_requested"] } },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
        ...(editor && { lastEditedByUserId: editor.userId, lastEditedByRole: editor.role }),
      },
    },
  );
  return result.modifiedCount > 0 || result.matchedCount > 0;
}

// Returns the timestamp actually written, or null if this record wasn't in
// a submittable state (already submitted, mismatched client, etc.) — the
// caller uses that null-ness rather than a separately-generated timestamp
// to decide whether the submission truly happened.
export async function submit(onboardingId: ObjectId, clientId: ObjectId, editor?: EditorActor): Promise<Date | null> {
  const now = new Date();
  const result = await (await collection()).updateOne(
    { _id: onboardingId, clientId, status: { $in: ["draft", "changes_requested"] } },
    {
      $set: {
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
        ...(editor && { lastEditedByUserId: editor.userId, lastEditedByRole: editor.role }),
      },
    },
  );
  return result.modifiedCount > 0 ? now : null;
}

export async function markUnderReview(onboardingId: ObjectId): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { _id: onboardingId, status: "submitted" },
    { $set: { status: "under_review", updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function review(
  onboardingId: ObjectId,
  reviewedByUserId: ObjectId,
  decision: ReviewDecision,
  notes: string | null,
): Promise<boolean> {
  const now = new Date();
  const nextStatus: OnboardingStatus = decision === "approved" ? "approved" : "changes_requested";

  const result = await (await collection()).updateOne(
    { _id: onboardingId, status: { $in: ["submitted", "under_review"] } },
    {
      $set: {
        status: nextStatus,
        updatedAt: now,
        review: { reviewedByUserId, reviewedAt: now, decision, notes },
      },
    },
  );
  return result.modifiedCount > 0;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type AdminListResult = { records: OnboardingDoc[]; total: number };

// Regex search across a fixed small set of fields — fine at this scale;
// there's no text index, so this doesn't scale to a large collection. The
// search term is always escaped before use: it comes from the admin's
// query box, and an unescaped value could both throw (invalid regex) and,
// with a pathological pattern, make a single query pin the event loop.
export async function listForAdmin(
  filter: { status?: OnboardingStatus; q?: string },
  pagination: { skip: number; limit: number },
): Promise<AdminListResult> {
  const query: Record<string, unknown> = {};
  if (filter.status) {
    query.status = filter.status;
  } else {
    // No explicit filter ("All") still excludes drafts — an unfinished,
    // never-submitted visitor draft isn't a "submission" for admin
    // purposes, and most visitors who start one will never finish it.
    query.status = { $ne: "draft" };
  }
  if (filter.q && filter.q.trim()) {
    const regex = new RegExp(escapeRegex(filter.q.trim()), "i");
    query.$or = [
      { "company.name": regex },
      { "company.contactPerson": regex },
      { "company.email": regex },
    ];
  }

  const coll = await collection();
  const [records, total] = await Promise.all([
    coll.find(query).sort({ updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
    coll.countDocuments(query),
  ]);

  return { records, total };
}

// Company-name lookup for the handover history search (Phase 5 §15) —
// resolves a free-text query to the onboarding ids it matches so the
// caller can filter another collection (assignmentHandovers has no
// company name of its own to search) without loading unbounded records
// into the browser to filter client-side.
export async function searchIdsByCompanyName(q: string): Promise<ObjectId[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const regex = new RegExp(escapeRegex(trimmed), "i");
  const docs = await (await collection()).find({ "company.name": regex }, { projection: { _id: 1 } }).toArray();
  return docs.map((d) => d._id);
}

// One aggregation instead of one countDocuments per status — used by the
// admin dashboard overview.
export async function countByStatus(): Promise<Record<string, number>> {
  const coll = await collection();
  const results = await coll
    .aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();

  return Object.fromEntries(results.map((r) => [r._id, r.count]));
}
