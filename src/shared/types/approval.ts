// Stage 1 Phase 12 — the client approval-center contract. No approval
// backend exists yet (see server/services/approvals.service.ts).
export type ApprovalStatus =
  | "awaiting_client"
  | "viewed"
  | "approved"
  | "changes_requested"
  | "updated"
  | "resubmitted"
  | "completed";

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  awaiting_client: "Awaiting Your Review",
  viewed: "Viewed",
  approved: "Approved",
  changes_requested: "Changes Requested",
  updated: "Updated",
  resubmitted: "Resubmitted",
  completed: "Completed",
};

export type ApprovalItem = {
  id: string;
  title: string;
  type: string;
  serviceLabel?: string;
  relatedLabel?: string;
  description?: string;
  previewUrl?: string;
  version?: number;
  status: ApprovalStatus;
  submittedAt: string;
};
