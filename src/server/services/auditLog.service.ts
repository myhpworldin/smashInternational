import "server-only";
import * as auditLogRepo from "@/server/repositories/auditLog.repo";
import type { AuditLogDoc } from "@/server/repositories/auditLog.repo";
import type { AuditAction, AuditLogRow } from "@/shared/types/auditLog";
import type { Role } from "@/shared/types/user";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const AUDIT_ACTIONS = new Set<AuditAction>([
  "user_created",
  "user_updated",
  "role_changed",
  "user_blocked",
  "user_unblocked",
  "user_deleted",
  "password_reset_by_admin",
  "password_changed_by_user",
  "forced_password_change_completed",
]);

function isAuditAction(value: string): value is AuditAction {
  return AUDIT_ACTIONS.has(value as AuditAction);
}

function toRow(doc: AuditLogDoc): AuditLogRow {
  return {
    id: doc._id.toHexString(),
    action: doc.action,
    actorUserId: doc.actorUserId.toHexString(),
    actorName: doc.actorName,
    actorEmail: doc.actorEmail,
    targetUserId: doc.targetUserId.toHexString(),
    targetName: doc.targetName,
    targetEmail: doc.targetEmail,
    targetRole: doc.targetRole,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
  };
}

// Mirrors onboarding.service.ts's listForAdmin shape (same DEFAULT/MAX
// page size convention, same {records,total,page,pageSize} return) —
// same server-side-pagination requirement, same reason: never load an
// unbounded audit collection into one render (Phase 7 spec, §9).
export async function listAuditLogsForAdmin(params: {
  action?: string;
  role?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ records: AuditLogRow[]; total: number; page: number; pageSize: number }> {
  const filter: auditLogRepo.AuditLogFilter = {
    action: params.action && isAuditAction(params.action) ? params.action : undefined,
    targetRole:
      params.role === "admin" || params.role === "client" || params.role === "staff"
        ? (params.role as Role)
        : undefined,
    q: params.q,
    from: params.from && !Number.isNaN(Date.parse(params.from)) ? new Date(params.from) : undefined,
    // Inclusive of the whole "to" day — a bare date parses to 00:00:00,
    // which would otherwise exclude every event from that day itself.
    to:
      params.to && !Number.isNaN(Date.parse(params.to))
        ? new Date(new Date(params.to).setHours(23, 59, 59, 999))
        : undefined,
  };

  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(params.page ?? 1, 1);

  const { records, total } = await auditLogRepo.listAuditLogs(filter, {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  return { records: records.map(toRow), total, page, pageSize };
}

export async function getAuditLogForAdmin(id: string): Promise<AuditLogRow | null> {
  const doc = await auditLogRepo.findById(id);
  return doc ? toRow(doc) : null;
}
