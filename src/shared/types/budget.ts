// Stage 1 Phase 12 — the ACTUAL budget/spend tracking contract. Distinct
// from the onboarding "planned" budget already shown on the dashboard and
// /dashboard/onboarding (Phase 2/4/8's DashboardData.budget /
// doc.budget) — that's what the client requested during onboarding, this
// is what SMASH is actually allocating/spending against it, once that
// exists. No backend for either allocated/spent tracking or budget-change
// requests exists yet (see server/services/budget.service.ts).
export type BudgetAllocationChannel = {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
};

export type BudgetSnapshot = {
  periodLabel: string;
  total: number;
  allocated: number;
  spent: number;
  remaining: number;
  allocations: BudgetAllocationChannel[];
  updatedAt: string | null;
};

export type BudgetRequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "applied";

export const BUDGET_REQUEST_STATUS_LABEL: Record<BudgetRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  applied: "Applied",
};

export type BudgetChangeRequest = {
  id: string;
  channelName?: string;
  campaignName?: string;
  currentAllocation: number;
  requestedAllocation: number;
  reason: string;
  status: BudgetRequestStatus;
  requestedAt: string;
};
