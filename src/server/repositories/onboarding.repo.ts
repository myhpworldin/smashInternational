import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { OnboardingStatus, ReviewDecision } from "@/shared/types/onboarding";

const COLLECTION = "onboarding";

export type ServiceResponseDoc = { serviceId: string; responses: Record<string, unknown> };

export type OnboardingDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  // The credential for the public, no-login onboarding flow — see
  // server/onboarding/access.ts. Unique per record.
  accessToken: string;
  // Null for the no-login flow (there is no user account behind an
  // anonymous visit) — only ever set if an admin-side creation path is
  // added later.
  createdByUserId: ObjectId | null;
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

function emptyDoc(clientId: ObjectId, accessToken: string): OnboardingDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    clientId,
    accessToken,
    createdByUserId: null,
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

export type DraftPatch = Partial<
  Pick<
    OnboardingDoc,
    "company" | "objectives" | "targetAudience" | "selectedServiceIds" | "serviceResponses" | "budget" | "brandProfile"
  >
>;

// Only permitted while the record is still a draft or kicked back for
// changes — a submitted/under_review/approved record is not editable here.
export async function updateDraft(
  onboardingId: ObjectId,
  clientId: ObjectId,
  patch: DraftPatch,
): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { _id: onboardingId, clientId, status: { $in: ["draft", "changes_requested"] } },
    { $set: { ...patch, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0 || result.matchedCount > 0;
}

// Returns the timestamp actually written, or null if this record wasn't in
// a submittable state (already submitted, mismatched client, etc.) — the
// caller uses that null-ness rather than a separately-generated timestamp
// to decide whether the submission truly happened.
export async function submit(onboardingId: ObjectId, clientId: ObjectId): Promise<Date | null> {
  const now = new Date();
  const result = await (await collection()).updateOne(
    { _id: onboardingId, clientId, status: { $in: ["draft", "changes_requested"] } },
    { $set: { status: "submitted", submittedAt: now, updatedAt: now } },
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
