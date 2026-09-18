import type { PerformanceMetrics } from "@/shared/types/performance";

// Stage 1 Phase 14 — the daily/operational record contract (§28). A
// single record is identified by the combination of client + service +
// campaign-or-project + reportingDate (§8) — the frontend's job this
// phase is to recognize that combination and offer "Edit Existing
// Record" instead of silently letting the admin create a second one for
// the same day; actual duplicate prevention is a backend concern later.
export type DailyRecordSource = "manual_admin_entry" | "meta_ads_api" | "google_ads_api" | "csv_import" | "other";

export const DAILY_RECORD_SOURCE_LABEL: Record<DailyRecordSource, string> = {
  manual_admin_entry: "Manual Admin Entry",
  meta_ads_api: "Meta Ads API",
  google_ads_api: "Google Ads API",
  csv_import: "CSV Import",
  other: "Other",
};

// Project-oriented services (creative/technology category) don't report
// PerformanceMetrics at all — they report progress against tasks/
// milestones/deliverables instead (§13). Kept as its own small shape
// rather than folded into PerformanceMetrics, since none of the existing
// consumers of that type (KpiCard, reports, client Performance page) have
// any concept of "tasks pending."
export type DailyProjectProgress = {
  overallProgress?: number;
  tasksCompleted?: number;
  tasksPending?: number;
  milestonesCompleted?: number;
  milestonesPending?: number;
  deliverablesCompleted?: number;
  status?: string;
};

export type DailyRecordContext = {
  clientId: string;
  serviceId: string;
  serviceLabel: string;
  campaignOrProjectId?: string;
  campaignOrProjectLabel?: string;
  reportingDate: string;
};

export type DailyPerformanceRecord = DailyRecordContext & {
  id: string;
  metrics: PerformanceMetrics;
  projectProgress?: DailyProjectProgress;
  notes?: string;
  source: DailyRecordSource;
  // Read-only metadata (§16) — never hand-typed by the admin, always
  // stamped by whatever writes the record (today: nothing, since there's
  // no backend yet; later: the real save endpoint).
  updatedAt: string;
  updatedByName: string;
};
