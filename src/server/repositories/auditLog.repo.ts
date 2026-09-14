import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role } from "@/shared/types/user";
import type { AuditAction } from "@/shared/types/auditLog";

export type { AuditAction };

const COLLECTION = "adminAuditLogs";

// Append-only: nothing in this codebase updates or deletes a row here
// once written (Stage 2 Phase 7 spec, §10 — immutability). If deletion is
// ever legally/operationally required, that's a separate, deliberately
// controlled feature, not a function added here casually. The action
// union itself lives in shared/types/auditLog.ts (both server and client
// code need it; this file can't be imported client-side).

// actor/target name+email are snapshotted at write time, not looked up
// live from the users collection at read time — an audit record must
// stay meaningful even if the account is later renamed, or (in principle)
// removed. targetRole is snapshotted the same way, so filtering by role
// never needs a join. metadata NEVER carries a password, hash, OTP code,
// or token — see the callers in adminUsers.service.ts / auth.service.ts,
// none of which ever pass one in (Stage 2 Phase 7 spec, §4).
export type AuditLogDoc = {
  _id: ObjectId;
  action: AuditAction;
  actorUserId: ObjectId;
  actorName: string;
  actorEmail: string;
  targetUserId: ObjectId;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<AuditLogDoc>(COLLECTION);
}

export async function record(entry: {
  action: AuditAction;
  actorUserId: ObjectId;
  actorName: string;
  actorEmail: string;
  targetUserId: ObjectId;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await (await collection()).insertOne({
    _id: new ObjectId(),
    action: entry.action,
    actorUserId: entry.actorUserId,
    actorName: entry.actorName,
    actorEmail: entry.actorEmail,
    targetUserId: entry.targetUserId,
    targetName: entry.targetName,
    targetEmail: entry.targetEmail,
    targetRole: entry.targetRole,
    metadata: entry.metadata ?? {},
    createdAt: new Date(),
  });
}

export async function findById(id: string): Promise<AuditLogDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await collection()).findOne({ _id: new ObjectId(id) });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type AuditLogFilter = {
  action?: AuditAction;
  targetRole?: Role;
  q?: string;
  from?: Date;
  to?: Date;
};

// Same shape as onboarding.repo.ts's listForAdmin: a plain query object
// built up from whichever filters were passed, one find + one
// countDocuments, sorted newest-first, page/limit-bounded by the caller
// (see listAuditLogsForAdmin in adminUsers.service.ts) — never an
// unbounded fetch (Stage 2 Phase 7 spec, §9).
export async function listAuditLogs(
  filter: AuditLogFilter,
  pagination: { skip: number; limit: number },
): Promise<{ records: AuditLogDoc[]; total: number }> {
  const query: Record<string, unknown> = {};

  if (filter.action) {
    query.action = filter.action;
  }
  if (filter.targetRole) {
    query.targetRole = filter.targetRole;
  }
  if (filter.from || filter.to) {
    const range: Record<string, Date> = {};
    if (filter.from) range.$gte = filter.from;
    if (filter.to) range.$lte = filter.to;
    query.createdAt = range;
  }
  if (filter.q && filter.q.trim()) {
    // One free-text box covering every identifier the spec's "search"
    // section lists (actor, target, email) rather than separate actor/
    // target search fields — see AuditLogFilters.tsx for why.
    const regex = new RegExp(escapeRegex(filter.q.trim()), "i");
    query.$or = [{ actorName: regex }, { actorEmail: regex }, { targetName: regex }, { targetEmail: regex }];
  }

  const coll = await collection();
  const [records, total] = await Promise.all([
    coll.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).toArray(),
    coll.countDocuments(query),
  ]);

  return { records, total };
}
