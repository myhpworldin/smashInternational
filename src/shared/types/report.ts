import type { PerformanceSnapshot } from "@/shared/types/performance";
import type { ClientProject } from "@/shared/types/project";

// Stage 1 Phase 11 — the client-facing report data contract (§31).
// Deliberately reuses Phase 10's PerformanceSnapshot and Phase 9's
// ClientProject rather than a second, parallel metrics/project shape —
// a report is a view onto the same performance/project data, not a
// different dataset. No report backend exists yet (see
// server/services/reports.service.ts, which returns []/null in
// production).
export type ReportType = "monthly" | "campaign" | "service" | "project";

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  monthly: "Monthly Performance Report",
  campaign: "Campaign Report",
  service: "Service Report",
  project: "Project Report",
};

export type ReportStatus = "available" | "draft" | "pending" | "not_available";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  available: "Available",
  draft: "Draft",
  pending: "Pending",
  not_available: "Not Available",
};

export type ReportPeriod = { label: string; startDate: string; endDate: string };

export type ReportListItem = {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  period: ReportPeriod;
  serviceLabel?: string;
  summary?: string;
  generatedAt?: string | null;
  updatedAt?: string | null;
};

// The full report — everything beyond ReportListItem is optional (§5:
// "do not force every report type to contain identical information"). A
// campaign report might only ever populate `campaigns`; a project report
// only `project`. The UI renders whichever pieces are present and shows a
// section-specific empty state for the rest.
export type ClientReport = ReportListItem & {
  companyName: string | null;
  objectives: string[];
  executiveSummary: string | null;
  performance: PerformanceSnapshot | null;
  project: ClientProject | null;
  budget: { monthlyTotal: number; allocated?: number; spent?: number; remaining?: number } | null;
  // Free-text content supplied by the (future) backend — the frontend
  // never generates or infers these (§9/§16/§18: no invented
  // recommendations or conclusions).
  optimizationNotes: string[];
  nextMonthPlan: string[];
};
