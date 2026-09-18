// Stage 1 Phase 9 — the client-facing campaign data contract (§29),
// deliberately a simplified lifecycle rather than the internal workflow
// (§3/§17: no "Brief Created"/"Creative Ready"/etc. states here — those
// stay internal). No campaign backend/collection exists yet (see
// server/services/campaigns.service.ts, which returns an empty list in
// production).
export type ClientCampaignStatus =
  | "planning"
  | "approval"
  | "live"
  | "optimizing"
  | "paused"
  | "on_hold"
  | "completed"
  | "cancelled";

export const CAMPAIGN_STATUS_LABEL: Record<ClientCampaignStatus, string> = {
  planning: "Planning",
  approval: "Approval",
  live: "Live",
  optimizing: "Optimizing",
  paused: "Paused",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Stage 1 Phase 18 §5/§24 — the backend-enforced transition graph, same
// pattern as project.ts's VALID_PROJECT_TRANSITIONS and
// serviceEngagement.ts's VALID_ENGAGEMENT_TRANSITIONS. A status is always
// allowed to "transition" to itself (idempotent no-op); callers check
// `next === current` before consulting this graph.
export const VALID_CAMPAIGN_TRANSITIONS: Record<ClientCampaignStatus, readonly ClientCampaignStatus[]> = {
  planning: ["approval", "on_hold", "cancelled"],
  approval: ["planning", "live", "on_hold", "cancelled"],
  live: ["optimizing", "paused", "on_hold", "completed", "cancelled"],
  optimizing: ["live", "paused", "on_hold", "completed", "cancelled"],
  paused: ["live", "optimizing", "cancelled"],
  on_hold: ["planning", "live", "cancelled"],
  // Terminal — nothing transitions out of completed or cancelled.
  completed: [],
  cancelled: [],
};

export function isValidCampaignTransition(from: ClientCampaignStatus, to: ClientCampaignStatus): boolean {
  return VALID_CAMPAIGN_TRANSITIONS[from].includes(to);
}

export type ClientCampaign = {
  id: string;
  clientId: string;
  serviceId: string;
  serviceLabel: string;
  name: string;
  platform?: string;
  objective?: string;
  status: ClientCampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  remaining?: number;
  progress?: number;
  latestUpdate?: { message: string; updatedAt: string } | null;
  updatedAt: string;
};
