// Stage 1 Phase 7 §23/§35 — DEVELOPMENT FIXTURES ONLY.
//
// Nothing in src/app or src/server imports this file. It exists purely so
// a future local/dev-only preview harness (or a developer poking at
// DashboardData-shaped components in isolation) has ready-made scenario
// data to render against, without ever wiring fixture values into the
// real dashboard page or its server adapter (dashboard.service.ts) — that
// adapter only ever returns real, session-derived data or explicit
// `null`/empty values for domains with no backend yet.
//
// Do not import this from a production route or component. Do not label
// any value here as "live" or "current" if it's ever displayed.
import type { DashboardData } from "@/shared/types/dashboard";

function base(overrides: Partial<DashboardData>): DashboardData {
  return {
    client: { companyName: "ABC Company", email: "client@abc-company.example" },
    account: { status: "under_review", label: "Under Review" },
    onboarding: { status: "submitted", submittedAt: "2026-09-17T10:00:00.000Z", selectedServiceLabels: [], reviewNotes: null },
    services: [],
    activeWork: [],
    budget: null,
    performance: null,
    actions: [],
    activity: [],
    budgetSnapshot: null,
    pendingApprovalsCount: 0,
    recentDeliverablesCount: 0,
    accountManagerName: null,
    ...overrides,
  };
}

// Scenario A — new client, onboarding under review.
export const scenarioUnderReview: DashboardData = base({
  onboarding: {
    status: "submitted",
    submittedAt: "2026-09-17T10:00:00.000Z",
    selectedServiceLabels: ["Social Media Management", "Meta Ads", "Google Ads"],
    reviewNotes: null,
  },
});

// Scenario B — approved, no active services yet.
export const scenarioApprovedPreActivation: DashboardData = base({
  account: { status: "approved", label: "Approved" },
  onboarding: {
    status: "approved",
    submittedAt: "2026-09-15T10:00:00.000Z",
    selectedServiceLabels: ["Website Development"],
    reviewNotes: null,
  },
  activity: [
    { id: "1", label: "Onboarding submitted", occurredAt: "2026-09-15T10:00:00.000Z" },
    { id: "2", label: "Onboarding approved", occurredAt: "2026-09-16T09:00:00.000Z" },
  ],
});

// Scenario C — active client, one service.
export const scenarioActiveOneService: DashboardData = base({
  account: { status: "active", label: "Active" },
  onboarding: { status: "approved", submittedAt: "2026-09-01T10:00:00.000Z", selectedServiceLabels: ["Website Development"], reviewNotes: null },
  services: [
    {
      id: "svc1",
      serviceId: "website_development",
      serviceLabel: "Website Development",
      status: "active",
      sourceOnboardingId: "ob1",
      requestedAt: "2026-09-01T10:00:00.000Z",
      approvedAt: "2026-09-02T10:00:00.000Z",
      activatedAt: "2026-09-05T10:00:00.000Z",
      pausedAt: null,
      completedAt: null,
    },
  ],
});

// Scenario D — active client, multiple services with mixed statuses.
export const scenarioActiveMultipleServices: DashboardData = base({
  account: { status: "active", label: "Active" },
  onboarding: {
    status: "approved",
    submittedAt: "2026-08-01T10:00:00.000Z",
    selectedServiceLabels: ["Social Media Management", "Meta Ads", "Google Ads", "SEO"],
    reviewNotes: null,
  },
  services: [
    { id: "s1", serviceId: "social_media_management", serviceLabel: "Social Media Management", status: "active", sourceOnboardingId: "ob1", requestedAt: "2026-08-01T10:00:00.000Z", approvedAt: "2026-08-02T10:00:00.000Z", activatedAt: "2026-08-05T10:00:00.000Z", pausedAt: null, completedAt: null },
    { id: "s2", serviceId: "meta_ads", serviceLabel: "Meta Ads", status: "active", sourceOnboardingId: "ob1", requestedAt: "2026-08-01T10:00:00.000Z", approvedAt: "2026-08-02T10:00:00.000Z", activatedAt: "2026-08-06T10:00:00.000Z", pausedAt: null, completedAt: null },
    { id: "s3", serviceId: "google_ads", serviceLabel: "Google Ads", status: "ready_to_start", sourceOnboardingId: "ob1", requestedAt: "2026-08-01T10:00:00.000Z", approvedAt: "2026-08-02T10:00:00.000Z", activatedAt: null, pausedAt: null, completedAt: null },
    { id: "s4", serviceId: "seo", serviceLabel: "SEO", status: "on_hold", sourceOnboardingId: "ob1", requestedAt: "2026-08-01T10:00:00.000Z", approvedAt: "2026-08-02T10:00:00.000Z", activatedAt: null, pausedAt: null, completedAt: null },
  ],
});

// Scenario F — client with no budget configured.
export const scenarioNoBudget: DashboardData = scenarioActiveOneService;

// Scenario H — client with an action required.
export const scenarioActionRequired: DashboardData = base({
  account: { status: "action_required", label: "Action Required" },
  onboarding: {
    status: "changes_requested",
    submittedAt: "2026-09-10T10:00:00.000Z",
    selectedServiceLabels: ["SEO"],
    reviewNotes: "Please provide updated target audience information.",
  },
  actions: [
    {
      id: "onboarding-changes-requested",
      label: "Onboarding changes requested",
      description: "Please provide updated target audience information.",
      href: "/onboarding",
    },
  ],
});

// Scenario I — client with no actions required is just any scenario above
// with `actions: []` (the default in `base`) — ActionRequired renders
// nothing in that case, which is itself the thing to verify.
export const scenarioNoActions: DashboardData = scenarioActiveOneService;
