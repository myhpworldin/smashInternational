// Stage 1 Phase 3 — the client-facing "does SMASH actually provide this
// service to this client, and in what state" record. Deliberately separate
// from ServiceAssignment (shared/types/serviceAssignment.ts), which answers
// a different question — "which staff member currently operates it" — and
// from the onboarding submission itself, which is a point-in-time request,
// not an ongoing operational record. See serviceEngagements.repo.ts for the
// full rationale.
//
// Lowercase_snake_case to match every other status enum in this codebase
// (OnboardingStatus, AssignmentStatus) rather than introducing a new
// SCREAMING_CASE convention.
export type ServiceEngagementStatus =
  | "requested"
  | "under_review"
  | "approved"
  | "planning"
  | "ready_to_start"
  | "active"
  | "paused"
  | "on_hold"
  | "completed"
  | "cancelled";

export const SERVICE_ENGAGEMENT_STATUSES: readonly ServiceEngagementStatus[] = [
  "requested",
  "under_review",
  "approved",
  "planning",
  "ready_to_start",
  "active",
  "paused",
  "on_hold",
  "completed",
  "cancelled",
];

export const SERVICE_ENGAGEMENT_STATUS_LABEL: Record<ServiceEngagementStatus, string> = {
  requested: "Requested",
  under_review: "Under Review",
  approved: "Approved",
  planning: "Planning",
  ready_to_start: "Ready to Start",
  active: "Active",
  paused: "Paused",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

// A "live" engagement occupies the (clientId, serviceId) slot and blocks a
// new one from being created for the same pair — mirrors
// serviceAssignments.repo.ts's identical "live" concept for the same
// reason: a cancelled/completed engagement is history, not a current claim.
export const LIVE_SERVICE_ENGAGEMENT_STATUSES: readonly ServiceEngagementStatus[] = [
  "requested",
  "under_review",
  "approved",
  "planning",
  "ready_to_start",
  "active",
  "paused",
  "on_hold",
];

// Stage 1 Phase 4 — the backend-enforced transition graph (§14). Every
// admin-driven status change must go through isValidEngagementTransition;
// nothing accepts an arbitrary status value from a request. A status is
// always allowed to "transition" to itself (idempotent no-op — §21), so
// that isn't listed per-state here; callers check `next === current`
// before consulting this graph.
export const VALID_ENGAGEMENT_TRANSITIONS: Record<ServiceEngagementStatus, readonly ServiceEngagementStatus[]> = {
  requested: ["under_review", "approved", "cancelled"],
  under_review: ["approved", "cancelled"],
  approved: ["planning", "cancelled"],
  planning: ["ready_to_start", "on_hold", "cancelled"],
  ready_to_start: ["active", "on_hold", "cancelled"],
  active: ["paused", "on_hold", "completed", "cancelled"],
  paused: ["active", "cancelled"],
  on_hold: ["planning", "active", "cancelled"],
  // Terminal — nothing transitions out of completed or cancelled.
  completed: [],
  cancelled: [],
};

export function isValidEngagementTransition(
  from: ServiceEngagementStatus,
  to: ServiceEngagementStatus,
): boolean {
  return VALID_ENGAGEMENT_TRANSITIONS[from].includes(to);
}

// The admin status control's dropdown options — only ever the statuses
// that are actually reachable from the current one, so the UI can't even
// offer an invalid transition for the backend to have to reject.
export function getValidNextStatuses(from: ServiceEngagementStatus): readonly ServiceEngagementStatus[] {
  return VALID_ENGAGEMENT_TRANSITIONS[from];
}

// Client-facing row shape — flat and pre-resolved (service label, not just
// serviceId) for the same reason ServiceAssignmentRow is: never hand the
// client raw internal ids to resolve themselves.
export type ServiceEngagementRow = {
  id: string;
  serviceId: string;
  serviceLabel: string;
  status: ServiceEngagementStatus;
  sourceOnboardingId: string;
  requestedAt: string;
  approvedAt: string | null;
  activatedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
};
