import type { Role } from "@/shared/types/user";

export type AuditAction =
  | "user_created"
  | "user_updated"
  | "role_changed"
  | "user_blocked"
  | "user_unblocked"
  | "password_reset_by_admin"
  | "password_changed_by_user"
  | "forced_password_change_completed";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  user_created: "User Created",
  user_updated: "User Updated",
  role_changed: "Role Changed",
  user_blocked: "User Blocked",
  user_unblocked: "User Unblocked",
  password_reset_by_admin: "Password Reset",
  password_changed_by_user: "Password Changed",
  forced_password_change_completed: "Forced Password Change Completed",
};

export const AUDIT_ACTION_FILTERS: { id: AuditAction; label: string }[] = [
  { id: "user_created", label: AUDIT_ACTION_LABEL.user_created },
  { id: "user_updated", label: AUDIT_ACTION_LABEL.user_updated },
  { id: "role_changed", label: AUDIT_ACTION_LABEL.role_changed },
  { id: "user_blocked", label: AUDIT_ACTION_LABEL.user_blocked },
  { id: "user_unblocked", label: AUDIT_ACTION_LABEL.user_unblocked },
  { id: "password_reset_by_admin", label: AUDIT_ACTION_LABEL.password_reset_by_admin },
  { id: "password_changed_by_user", label: AUDIT_ACTION_LABEL.password_changed_by_user },
  { id: "forced_password_change_completed", label: AUDIT_ACTION_LABEL.forced_password_change_completed },
];

// Row shape handed to the client components — dates travel as Date
// objects (RSC serialization handles that), metadata is whatever each
// action's write call put there (never a secret — see auditLog.repo.ts).
export type AuditLogRow = {
  id: string;
  action: AuditAction;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  metadata: Record<string, unknown>;
  createdAt: Date;
};
