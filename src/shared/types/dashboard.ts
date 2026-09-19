import type { OnboardingStatus } from "@/shared/types/onboarding";
import type { ServiceEngagementRow } from "@/shared/types/serviceEngagement";
import type { BudgetSnapshot } from "@/shared/types/budget";

// Stage 1 Phase 7 §22 — the dashboard's data contract. Every field here is
// either real today (client/account/onboarding/services/budget/activity)
// or explicitly `null`/empty because no backend for it exists yet
// (activeWork/performance/notifications) — never a fixture value smuggled
// in as if it were real. UI components take this shape as a prop; none of
// them fetch or assume anything about where it came from, so swapping the
// server adapter for a richer one in a later phase never touches them.
export type AccountLifecycleStatus = "onboarding" | "under_review" | "action_required" | "approved" | "active";

export const ACCOUNT_LIFECYCLE_LABEL: Record<AccountLifecycleStatus, string> = {
  onboarding: "Onboarding",
  under_review: "Under Review",
  action_required: "Action Required",
  approved: "Approved",
  active: "Active",
};

// Derives the account-level lifecycle purely from onboarding status +
// engagement statuses (Phase 4's own conclusion: this is never persisted
// as its own field, since it would just be a value that could drift out
// of sync with its real sources). "Active" only once at least one service
// engagement has actually reached "active" — an approved onboarding does
// not itself mean anything is active yet (Phase 4 §18, restated by this
// phase's §9/§10).
export function resolveAccountLifecycle(
  onboardingStatus: OnboardingStatus,
  engagements: Pick<ServiceEngagementRow, "status">[],
): AccountLifecycleStatus {
  if (onboardingStatus === "changes_requested") return "action_required";
  if (onboardingStatus === "submitted" || onboardingStatus === "under_review") return "under_review";
  if (onboardingStatus === "draft") return "onboarding";
  // "approved" from here on.
  return engagements.some((e) => e.status === "active") ? "active" : "approved";
}

export type DashboardActionItem = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  label: string;
  occurredAt: string;
  // Stage 1 Phase 15 — optional so existing callers/fixtures that predate
  // this field stay valid; ActivityTimeline links the item when present.
  href?: string;
};

// Neither of these has a backend yet (Phase 7 §15-19) — always `null` in
// production. The shapes exist so a later phase's real adapter can start
// returning populated values without any dashboard component changing.
export type ActiveWorkItem = {
  id: string;
  name: string;
  kind: "campaign" | "project";
  service: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  progress?: number;
  stage?: string;
  expectedCompletion?: string;
};

export type PerformanceMetric = { label: string; value?: string };

export type DashboardBudget = {
  monthlyTotal: number;
  allocations: { channel: string; amount: number }[];
};

export type DashboardData = {
  client: { companyName: string | null; email: string };
  account: { status: AccountLifecycleStatus; label: string };
  onboarding: {
    status: OnboardingStatus;
    submittedAt: string | null;
    selectedServiceLabels: string[];
    reviewNotes: string | null;
  };
  services: ServiceEngagementRow[];
  // Always a real (possibly empty) array as of Phase 9 — projects.service.ts
  // and campaigns.service.ts are real integration points now, just with no
  // backend behind them yet, so "nothing yet" is `[]`, not `null`.
  activeWork: ActiveWorkItem[];
  // The client's onboarding-planned budget (Phase 2/4) — kept separate
  // from Phase 12's actual-spend BudgetSnapshot, a different concept (see
  // shared/types/budget.ts).
  budget: DashboardBudget | null;
  performance: PerformanceMetric[] | null;
  actions: DashboardActionItem[];
  activity: DashboardActivityItem[];
  budgetSnapshot: BudgetSnapshot | null;
  pendingApprovalsCount: number;
  recentDeliverablesCount: number;
  // Stage 1 Phase 28 §18 — the one client-safe fact about internal
  // service-assignment continuity: who the client's current account
  // manager is, by name only. `null` when none has been assigned yet —
  // never a fabricated name, and never any detail about *why* it's the
  // current person (no "replaced Rahul," no handover status).
  accountManagerName: string | null;
};
