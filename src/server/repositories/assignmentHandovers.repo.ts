import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";

const COLLECTION = "assignmentHandovers";

export type HandoverStatus = "pending" | "cancelled" | "completed";

// Append-only history of who owned an assignment before whoever owns it
// now (Phase 1 audit §12/§20 — never overwrite fromStaffUserId, always add
// a row). Phase 2 only ever writes "pending" (a handover was triggered,
// no replacement chosen yet) and "cancelled" (the departing staff came
// back before anyone was chosen). "completed" — a replacement actually
// took over — is Phase 3's write, not this phase's.
export type AssignmentHandoverDoc = {
  _id: ObjectId;
  assignmentId: ObjectId;
  onboardingId: ObjectId;
  serviceId: string;
  fromStaffUserId: ObjectId;
  toStaffUserId: ObjectId | null;
  reason: string | null;
  initiatedByUserId: ObjectId;
  initiatedAt: Date;
  completedAt: Date | null;
  status: HandoverStatus;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<AssignmentHandoverDoc>(COLLECTION);
}

export async function createPending(
  entries: {
    assignmentId: ObjectId;
    onboardingId: ObjectId;
    serviceId: string;
    fromStaffUserId: ObjectId;
    reason: string | null;
    initiatedByUserId: ObjectId;
  }[],
  session?: ClientSession,
): Promise<void> {
  if (entries.length === 0) return;
  const now = new Date();
  await (await collection()).insertMany(
    entries.map((entry) => ({
      _id: new ObjectId(),
      assignmentId: entry.assignmentId,
      onboardingId: entry.onboardingId,
      serviceId: entry.serviceId,
      fromStaffUserId: entry.fromStaffUserId,
      toStaffUserId: null,
      reason: entry.reason,
      initiatedByUserId: entry.initiatedByUserId,
      initiatedAt: now,
      completedAt: null,
      status: "pending" as const,
    })),
    { session },
  );
}

// The other half of serviceAssignments.repo.ts's revertToActive — the
// pending handover record for an assignment that just went back to active
// is no longer live, but it must stay in history as "cancelled," not be
// deleted (Phase 1 §9 — never erase history).
export async function cancelPendingForAssignments(assignmentIds: ObjectId[], session?: ClientSession): Promise<void> {
  if (assignmentIds.length === 0) return;
  await (await collection()).updateMany(
    { assignmentId: { $in: assignmentIds }, status: "pending" },
    { $set: { status: "cancelled", completedAt: new Date() } },
    { session },
  );
}

export async function listByAssignment(assignmentId: ObjectId): Promise<AssignmentHandoverDoc[]> {
  return (await collection()).find({ assignmentId }).sort({ initiatedAt: -1 }).toArray();
}

export async function findPendingByAssignment(
  assignmentId: ObjectId,
  session?: ClientSession,
): Promise<AssignmentHandoverDoc | null> {
  return (await collection()).findOne({ assignmentId, status: "pending" }, { session });
}

// Same concurrency guard as serviceAssignments.repo.ts's transferOwnership
// — conditioned on still being "pending" so a second concurrent transfer
// attempt can't complete the same handover record twice.
export async function completePending(
  handoverId: ObjectId,
  toStaffUserId: ObjectId,
  session: ClientSession,
): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { _id: handoverId, status: "pending" },
    { $set: { toStaffUserId, completedAt: new Date(), status: "completed" } },
    { session },
  );
  return result.modifiedCount === 1;
}

// Defensive fallback for transferAssignment: an assignment can in
// principle reach handover_required without a pending row already
// existing for it (e.g. data seeded directly, or a future trigger this
// phase didn't anticipate) — rather than fail the whole handover on a
// missing history row, this records the transition directly as already
// completed, so history is still accurate even though no "pending" phase
// was observed for it.
export async function createCompleted(
  entry: {
    assignmentId: ObjectId;
    onboardingId: ObjectId;
    serviceId: string;
    fromStaffUserId: ObjectId;
    toStaffUserId: ObjectId;
    reason: string | null;
    initiatedByUserId: ObjectId;
  },
  session: ClientSession,
): Promise<void> {
  const now = new Date();
  await (await collection()).insertOne(
    {
      _id: new ObjectId(),
      assignmentId: entry.assignmentId,
      onboardingId: entry.onboardingId,
      serviceId: entry.serviceId,
      fromStaffUserId: entry.fromStaffUserId,
      toStaffUserId: entry.toStaffUserId,
      reason: entry.reason,
      initiatedByUserId: entry.initiatedByUserId,
      initiatedAt: now,
      completedAt: now,
      status: "completed",
    },
    { session },
  );
}

// Chronological (oldest first) completed transitions for one assignment —
// the admin-facing history timeline (Phase 3 §16). Pending/cancelled rows
// are deliberately excluded: they never represent an actual change of
// ownership.
export async function listCompletedByAssignment(assignmentId: ObjectId): Promise<AssignmentHandoverDoc[]> {
  return (await collection()).find({ assignmentId, status: "completed" }).sort({ completedAt: 1 }).toArray();
}

// How many of a staff member's assignments have already been transferred
// away (Phase 5 §5/§18) — combined with serviceAssignments.repo.ts's
// findHandoverRequiredByStaff (still pending), this gives "N of M handed
// over" without inventing a separate progress counter anywhere.
export async function countCompletedByFromStaff(staffUserId: ObjectId): Promise<number> {
  return (await collection()).countDocuments({ fromStaffUserId: staffUserId, status: "completed" });
}

export type CompletedHandoverFilter = {
  serviceId?: string;
  from?: Date;
  to?: Date;
  // Pre-resolved by the service layer (see handoverOverview.service.ts)
  // from a free-text query against users/onboarding — this collection has
  // no staff name or company name of its own to search directly.
  searchStaffIds?: ObjectId[];
  searchOnboardingIds?: ObjectId[];
};

// Org-wide completed-transfer history (Phase 5 §13/§14/§15) — same
// shape/pagination convention as onboarding.repo.ts's listForAdmin and
// auditLog.repo.ts's listAuditLogs (query object built from whichever
// filters were passed, skip/limit-bounded, never an unbounded fetch).
export async function listAllCompleted(
  filter: CompletedHandoverFilter,
  pagination: { skip: number; limit: number },
): Promise<{ records: AssignmentHandoverDoc[]; total: number }> {
  const query: Record<string, unknown> = { status: "completed" };
  if (filter.serviceId) query.serviceId = filter.serviceId;
  if (filter.searchStaffIds || filter.searchOnboardingIds) {
    const or: Record<string, unknown>[] = [];
    if (filter.searchStaffIds?.length) {
      or.push({ fromStaffUserId: { $in: filter.searchStaffIds } }, { toStaffUserId: { $in: filter.searchStaffIds } });
    }
    if (filter.searchOnboardingIds?.length) {
      or.push({ onboardingId: { $in: filter.searchOnboardingIds } });
    }
    // A search term that matched nothing must return zero rows, not "no
    // filter applied" — an empty $or would otherwise match everything.
    query.$or = or.length > 0 ? or : [{ _id: null }];
  }
  if (filter.from || filter.to) {
    const range: Record<string, Date> = {};
    if (filter.from) range.$gte = filter.from;
    if (filter.to) range.$lte = filter.to;
    query.completedAt = range;
  }

  const coll = await collection();
  const [records, total] = await Promise.all([
    coll.find(query).sort({ completedAt: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
    coll.countDocuments(query),
  ]);

  return { records, total };
}

export async function countAllCompleted(): Promise<number> {
  return (await collection()).countDocuments({ status: "completed" });
}
