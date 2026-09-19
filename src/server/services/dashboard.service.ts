import "server-only";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import { listCampaignsForClient } from "@/server/services/campaigns.service";
import { getBudgetForClient } from "@/server/services/budget.service";
import { listApprovalsForClient } from "@/server/services/approvals.service";
import { listDeliverablesForClient } from "@/server/services/deliverables.service";
import { getClientEvents } from "@/server/services/clientEvents.service";
import { getAccountManagerNameForClient } from "@/server/services/serviceAssignments.service";
import { getServiceById } from "@/shared/config/services";
import { resolveAccountLifecycle, ACCOUNT_LIFECYCLE_LABEL } from "@/shared/types/dashboard";
import type { DashboardData, DashboardActionItem } from "@/shared/types/dashboard";
import type { CompanyInput, BudgetInput } from "@/shared/validation/onboarding";

const RECENT_ACTIVITY_LIMIT = 10;

// The one place a OnboardingDoc + its engagements turn into the
// dashboard's data contract (Phase 7 §22). Every input here is already
// resolved from the caller's own session (resolveOnboardingIdentity,
// getCurrentUser) — this function does no auth/ownership work itself, it
// only shapes data it's handed.
export async function buildDashboardData(
  doc: OnboardingDoc,
  user: Pick<UserDoc, "email">,
): Promise<DashboardData> {
  const company = doc.company as Partial<CompanyInput> | null;
  const budget = doc.budget as Partial<BudgetInput> | null;

  const engagements = await listEngagementsForClient(doc.clientId);
  const account = resolveAccountLifecycle(doc.status, engagements);

  const actions: DashboardActionItem[] = [];
  if (doc.status === "changes_requested") {
    actions.push({
      id: "onboarding-changes-requested",
      label: "Onboarding changes requested",
      description: doc.review.notes ?? "SMASH has requested additional information.",
      href: "/onboarding",
    });
  }

  const activity = await getClientEvents(doc.clientId, RECENT_ACTIVITY_LIMIT);

  // Stage 1 Phase 9: projects.service.ts/campaigns.service.ts are real
  // integration points now (both routes/detail pages exist), just always
  // empty in production until a backend exists for either — so this is
  // now genuinely `[]` (a data source that currently has nothing), not
  // `null` (no capability at all) as it was in Phase 7.
  const [projects, campaigns, budgetSnapshot, approvals, deliverables, accountManagerName] = await Promise.all([
    listProjectsForClient(doc.clientId),
    listCampaignsForClient(doc.clientId),
    getBudgetForClient(doc.clientId),
    listApprovalsForClient(doc.clientId),
    listDeliverablesForClient(doc.clientId),
    getAccountManagerNameForClient(doc.clientId),
  ]);
  const pendingApprovalsCount = approvals.filter(
    (a) => a.status === "awaiting_client" || a.status === "updated" || a.status === "resubmitted",
  ).length;
  if (pendingApprovalsCount > 0) {
    actions.push({
      id: "pending-approvals",
      label: `${pendingApprovalsCount} approval${pendingApprovalsCount === 1 ? "" : "s"} awaiting your review`,
      description: "SMASH has shared work that needs your review.",
      href: "/dashboard/approvals",
    });
  }
  const activeWork: DashboardData["activeWork"] = [
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      kind: "project" as const,
      service: p.serviceLabel,
      status: p.status,
      startDate: p.startDate,
      expectedCompletion: p.targetEndDate,
      progress: p.progress,
    })),
    ...campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      kind: "campaign" as const,
      service: c.serviceLabel,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget,
      spent: c.spent,
      progress: c.progress,
    })),
  ];

  return {
    client: { companyName: company?.name ?? null, email: user.email },
    account: { status: account, label: ACCOUNT_LIFECYCLE_LABEL[account] },
    onboarding: {
      status: doc.status,
      submittedAt: doc.submittedAt ? doc.submittedAt.toISOString() : null,
      selectedServiceLabels: doc.selectedServiceIds.map((id) => getServiceById(id)?.label ?? id),
      reviewNotes: doc.review.notes,
    },
    services: engagements,
    activeWork,
    budget: budget?.monthlyTotal
      ? { monthlyTotal: budget.monthlyTotal, allocations: budget.allocations ?? [] }
      : null,
    performance: null,
    actions,
    activity,
    // Stage 1 Phase 12 — same "real seam, currently empty" story as
    // activeWork (Phase 9): budget.service.ts/approvals.service.ts/
    // deliverables.service.ts are real integration points now, just with
    // no backend behind any of them yet.
    budgetSnapshot,
    pendingApprovalsCount,
    recentDeliverablesCount: deliverables.length,
    accountManagerName,
  };
}
