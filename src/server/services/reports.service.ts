import "server-only";
import type { ObjectId } from "mongodb";
import type { ClientReport, ReportListItem } from "@/shared/types/report";

// Stage 1 Phase 11 — frontend-only phase (§37): no report backend/
// collection/generation exists. Same honest-empty seam as
// projects.service.ts/campaigns.service.ts/performance.service.ts — a
// later backend phase replaces these bodies with real queries, no page
// or component needs to change.
export async function listReportsForClient(_clientId: ObjectId): Promise<ReportListItem[]> {
  return [];
}

export async function getReportForClient(_reportId: string, _clientId: ObjectId): Promise<ClientReport | null> {
  return null;
}
