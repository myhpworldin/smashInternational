// Stage 1 Phase 9 — the client-facing project data contract (§29). No
// project backend/collection exists yet (see server/services/projects.service.ts,
// which returns an empty list in production) — this type is what a later
// backend phase populates without any UI component here needing to change.
export type ClientProjectStatus =
  | "planning"
  | "in_progress"
  | "client_review"
  | "changes_requested"
  | "on_hold"
  | "completed"
  | "cancelled";

export const PROJECT_STATUS_LABEL: Record<ClientProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  client_review: "Client Review",
  changes_requested: "Changes Requested",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Stage 1 Phase 17 §24 — the backend-enforced transition graph, same
// pattern as serviceEngagement.ts's VALID_ENGAGEMENT_TRANSITIONS. A status
// is always allowed to "transition" to itself (idempotent no-op); callers
// check `next === current` before consulting this graph.
export const VALID_PROJECT_TRANSITIONS: Record<ClientProjectStatus, readonly ClientProjectStatus[]> = {
  planning: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["client_review", "changes_requested", "on_hold", "completed", "cancelled"],
  client_review: ["in_progress", "changes_requested", "completed", "cancelled"],
  changes_requested: ["in_progress", "cancelled"],
  on_hold: ["planning", "in_progress", "cancelled"],
  // Terminal — nothing transitions out of completed or cancelled.
  completed: [],
  cancelled: [],
};

export function isValidProjectTransition(from: ClientProjectStatus, to: ClientProjectStatus): boolean {
  return VALID_PROJECT_TRANSITIONS[from].includes(to);
}

export type MilestoneStatus = "completed" | "in_progress" | "pending";

export type ProjectMilestone = {
  id: string;
  name: string;
  status: MilestoneStatus;
  completedAt?: string;
};

export type DeliverableStatus =
  | "planned"
  | "in_progress"
  | "ready_for_review"
  | "approved"
  | "changes_requested"
  | "completed";

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  completed: "Completed",
};

export type ProjectDeliverable = {
  id: string;
  name: string;
  type?: string;
  status: DeliverableStatus;
  submittedAt?: string;
  updatedAt?: string;
};

// Client-safe only (§11/§30) — never an internal task/employee-comment
// shape. A later backend phase is responsible for filtering out anything
// not meant for client eyes before it ever reaches this type.
export type ProjectTimelineEvent = {
  id: string;
  date: string;
  title: string;
  description?: string;
};

export type ClientProject = {
  id: string;
  clientId: string;
  serviceId: string;
  serviceLabel: string;
  name: string;
  description?: string;
  status: ClientProjectStatus;
  progress?: number;
  startDate?: string;
  targetEndDate?: string;
  completedDate?: string;
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  timeline: ProjectTimelineEvent[];
  latestUpdate?: { message: string; updatedAt: string } | null;
  updatedAt: string;
};
