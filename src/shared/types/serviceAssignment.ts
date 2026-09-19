// "active" is the only state that means "this staff member currently
// operates this service for this client." Everything else is either a
// continuity state (handover_required/handover_in_progress) or a terminal
// one (transferred/cancelled) — see serviceAssignments.repo.ts. Phase 3
// owns handover_in_progress/transferred; Phase 2 only ever writes
// active/handover_required/cancelled.
export type AssignmentStatus =
  | "active"
  | "handover_required"
  | "handover_in_progress"
  | "transferred"
  | "cancelled";

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: "Active",
  handover_required: "Handover Required",
  handover_in_progress: "Handover In Progress",
  transferred: "Transferred",
  cancelled: "Cancelled",
};

// Stage 1 Phase 28 §3A/§16 — "Account Manager" is a client-wide
// assignment (the overall relationship owner), distinct from a per-
// service assignment. Rather than a second collection/model duplicating
// every piece of continuity/handover/audit/notification machinery this
// file's assignment types already have, an account-manager assignment is
// just a ServiceAssignmentDoc whose `serviceId` is this reserved sentinel
// instead of a real catalog service id — it reuses the exact same
// create/reassign/handover/transfer/audit/notification code paths
// unchanged. Never a value `getServiceById` (shared/config/services.ts)
// could ever return, so it can't collide with a real service.
export const ACCOUNT_MANAGER_SLOT = "__account_manager__";

export function isAccountManagerSlot(serviceId: string): boolean {
  return serviceId === ACCOUNT_MANAGER_SLOT;
}

// One completed ownership transition (Phase 3 §16) — the admin view uses
// these to distinguish "current assignee" (the row's own staffName) from
// "previous assignees" (this list) without a separate history page.
export type HandoverHistoryEntry = {
  fromStaffName: string;
  toStaffName: string;
  completedAt: string;
  reason: string | null;
};

// Row shape for the admin-facing assignment list (Onboarding Detail) —
// deliberately flat/pre-joined (staff name, service label) rather than
// handing the client raw ObjectIds to resolve, per the Phase 1 audit's
// "no unrestricted client data" note.
export type ServiceAssignmentRow = {
  id: string;
  onboardingId: string;
  serviceId: string;
  serviceLabel: string;
  status: AssignmentStatus;
  staffUserId: string;
  staffName: string;
  staffEmail: string;
  assignedAt: string;
  updatedAt: string;
  handoverReason: string | null;
  handoverRequiredAt: string | null;
  // Only populated when status === "handover_required" — how many
  // active, non-blocked, available staff exist to receive this work.
  eligibleReplacementCount: number | null;
  // Empty unless this assignment has been transferred at least once.
  handoverHistory: HandoverHistoryEntry[];
};

// listHandoverRequiredForStaff's row — the admin bulk-handover queue for
// one departing staff member, which (unlike Onboarding Detail's list) spans
// multiple clients, so each row needs to say which client it's for.
export type StaffHandoverQueueRow = ServiceAssignmentRow & { clientCompanyName: string };

// Row shape for the staff-facing "my assignments" list — only ever the
// caller's own active assignments (server-side scoped, see
// serviceAssignments.service.ts's listActiveForStaff).
export type StaffAssignmentRow = {
  id: string;
  serviceId: string;
  serviceLabel: string;
  clientCompanyName: string;
  status: AssignmentStatus;
  assignedAt: string;
};
