// Stage 1 Phase 5 §3 — the client portal's information architecture, in
// one place so the sidebar, the mobile drawer, and (later) any
// breadcrumb all read from the same source instead of three copies
// drifting apart. "My Onboarding" points at the dedicated read-only
// summary page added in Phase 8 (dashboard/onboarding/page.tsx) — richer
// than the original plan of reusing /onboarding's own locked-status
// screen, which stays reserved for the editable wizard and the
// just-submitted transition (with its countdown into the dashboard).
export type ClientNavLink = { label: string; href: string };
export type ClientNavGroup = { label: string; items: ClientNavLink[] };

export const CLIENT_NAV_TOP: ClientNavLink = { label: "Dashboard", href: "/dashboard" };

export const CLIENT_NAV_GROUPS: ClientNavGroup[] = [
  {
    label: "My Business",
    items: [
      { label: "My Profile", href: "/dashboard/profile" },
      { label: "My Onboarding", href: "/dashboard/onboarding" },
      { label: "Documents", href: "/dashboard/documents" },
    ],
  },
  {
    label: "Services",
    items: [{ label: "My Services", href: "/dashboard/services" }],
  },
  {
    label: "Work",
    items: [
      { label: "Projects", href: "/dashboard/projects" },
      { label: "Campaigns", href: "/dashboard/campaigns" },
      // Split into two links as of Phase 12 (§5/§31/§35: Approvals and
      // Deliverables are related but distinct concepts, each with its own
      // list + detail experience now) — previously one combined
      // "Content & Approvals" placeholder link.
      { label: "Approvals", href: "/dashboard/approvals" },
      { label: "Deliverables", href: "/dashboard/deliverables" },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Performance", href: "/dashboard/performance" },
      { label: "Analytics", href: "/dashboard/analytics" },
      { label: "Reports", href: "/dashboard/reports" },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Budget & Spending", href: "/dashboard/budget" }],
  },
  {
    label: "Communication",
    items: [
      { label: "Notifications", href: "/dashboard/notifications" },
      { label: "Activity", href: "/dashboard/activity" },
      { label: "Messages", href: "/dashboard/messages" },
      { label: "Support", href: "/dashboard/support" },
    ],
  },
];
