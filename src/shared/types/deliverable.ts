import type { ApprovalStatus } from "@/shared/types/approval";

// Stage 1 Phase 12 §31/§35 — a first-class, top-level client-facing
// asset, distinct from ProjectDeliverable (shared/types/project.ts, which
// is scoped inside one project's own milestone breakdown). A
// ClientDeliverable can belong to any service/campaign/project, exists
// independently of whether it needs approval, and an ApprovalItem always
// refers to one specific deliverable+version rather than duplicating it.
// No backend exists yet (see server/services/deliverables.service.ts).
export type ClientDeliverableStatus =
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "waiting_for_approval"
  | "approved"
  | "changes_requested"
  | "completed"
  | "delivered";

export const CLIENT_DELIVERABLE_STATUS_LABEL: Record<ClientDeliverableStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  waiting_for_approval: "Waiting for Approval",
  approved: "Approved",
  changes_requested: "Changes Requested",
  completed: "Completed",
  delivered: "Delivered",
};

export type ClientDeliverable = {
  id: string;
  title: string;
  type: string;
  serviceLabel?: string;
  relatedLabel?: string;
  description?: string;
  previewUrl?: string;
  version: number;
  status: ClientDeliverableStatus;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
};
