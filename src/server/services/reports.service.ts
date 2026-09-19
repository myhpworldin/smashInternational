import "server-only";
import { ObjectId } from "mongodb";
import * as reportsRepo from "@/server/repositories/reports.repo";
import type { ReportDoc } from "@/server/repositories/reports.repo";
import * as onboardingRepo from "@/server/repositories/onboarding.repo";
import * as serviceEngagementsRepo from "@/server/repositories/serviceEngagements.repo";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import * as clientNotificationsRepo from "@/server/repositories/clientNotifications.repo";
import { buildPerformanceSnapshot } from "@/server/services/performance.service";
import { getBudgetForClient } from "@/server/services/budget.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import { getServiceById } from "@/shared/config/services";
import { BUSINESS_OBJECTIVES } from "@/shared/types/onboarding";
import { resolveMonthPeriod } from "@/shared/analytics/period";
import {
  isValidReportTransition,
  toClientReportStatus,
  type ReportGenerationStatus,
  type ClientReport,
  type ReportListItem,
} from "@/shared/types/report";
import type { CompanyInput } from "@/shared/validation/onboarding";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 21 — real persistence, replacing the Phase 11 stub (which
// always returned []/null). Keeps the exact ReportListItem/ClientReport
// shapes the Phase 11 frontend already consumes — no page or component
// needs to change. Report *generation* builds on Phase 20's analytics
// engine and Phase 17/18's project/budget services rather than
// duplicating any of their calculations (§2/§4).

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function displayName(user: Pick<UserDoc, "name" | "email">): string {
  return user.name?.trim() || user.email;
}

function toListItem(doc: ReportDoc): ReportListItem | null {
  const status = toClientReportStatus(doc.status);
  if (!status) return null;
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    type: doc.reportType,
    status,
    period: { label: doc.periodLabel, startDate: doc.periodStart, endDate: doc.periodEnd },
    serviceLabel: doc.serviceIds.length === 1 ? (getServiceById(doc.serviceIds[0])?.label ?? undefined) : undefined,
    summary: doc.executiveSummary ?? undefined,
    generatedAt: doc.generatedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toClientReport(doc: ReportDoc): ClientReport | null {
  const listItem = toListItem(doc);
  if (!listItem) return null;
  return {
    ...listItem,
    companyName: doc.companyName,
    objectives: doc.objectives,
    executiveSummary: doc.executiveSummary,
    performance: doc.performanceSnapshot,
    project: doc.projectSnapshot,
    budget: doc.budgetSnapshot,
    optimizationNotes: doc.optimizationNotes,
    nextMonthPlan: doc.nextMonthPlan,
  };
}

// Admin-facing view — includes internal lifecycle fields the client-safe
// ClientReport type deliberately omits (status as the real generation
// status, not the collapsed client vocabulary; actor/version metadata).
export type AdminReportView = {
  id: string;
  clientId: string;
  reportType: ReportDoc["reportType"];
  status: ReportGenerationStatus;
  period: { label: string; startDate: string; endDate: string };
  title: string;
  version: number;
  generatedAt: string;
  generatedByName: string;
  updatedAt: string;
  updatedByName: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
  archivedAt: string | null;
  report: ClientReport;
};

function toAdminView(doc: ReportDoc): AdminReportView {
  const clientReport = toClientReport(doc) ?? {
    id: doc._id.toHexString(),
    title: doc.title,
    type: doc.reportType,
    status: "not_available",
    period: { label: doc.periodLabel, startDate: doc.periodStart, endDate: doc.periodEnd },
    generatedAt: doc.generatedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    companyName: doc.companyName,
    objectives: doc.objectives,
    executiveSummary: doc.executiveSummary,
    performance: doc.performanceSnapshot,
    project: doc.projectSnapshot,
    budget: doc.budgetSnapshot,
    optimizationNotes: doc.optimizationNotes,
    nextMonthPlan: doc.nextMonthPlan,
  };

  return {
    id: doc._id.toHexString(),
    clientId: doc.clientId.toHexString(),
    reportType: doc.reportType,
    status: doc.status,
    period: { label: doc.periodLabel, startDate: doc.periodStart, endDate: doc.periodEnd },
    title: doc.title,
    version: doc.version,
    generatedAt: doc.generatedAt.toISOString(),
    generatedByName: doc.generatedByName,
    updatedAt: doc.updatedAt.toISOString(),
    updatedByName: doc.updatedByName,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    publishedByName: doc.publishedByName,
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
    report: clientReport,
  };
}

export async function listReportsForClient(clientId: ObjectId): Promise<ReportListItem[]> {
  const docs = await reportsRepo.listPublishedByClientId(clientId);
  return docs.map(toListItem).filter((r): r is ReportListItem => r !== null);
}

// Ownership + visibility enforced together (Phase 16 §6 pattern extended):
// a report id that exists but belongs to another client, or exists but
// isn't published yet, both resolve to the same null — never distinguish
// "not yours" from "not ready" to an unauthenticated guess.
export async function getReportForClient(reportId: string, clientId: ObjectId): Promise<ClientReport | null> {
  if (!ObjectId.isValid(reportId)) return null;
  const doc = await reportsRepo.findPublishedByIdAndClient(new ObjectId(reportId), clientId);
  return doc ? toClientReport(doc) : null;
}

export async function listReportsForAdmin(clientId: ObjectId): Promise<AdminReportView[]> {
  const docs = await reportsRepo.listByClientForAdmin(clientId);
  return docs.map(toAdminView);
}

export async function getReportForAdmin(reportId: string): Promise<AdminReportView | null> {
  if (!ObjectId.isValid(reportId)) return null;
  const doc = await reportsRepo.findById(new ObjectId(reportId));
  return doc ? toAdminView(doc) : null;
}

async function gatherReportSources(clientId: ObjectId, periodStart: string, periodEnd: string) {
  const engagements = await serviceEngagementsRepo.listByClientId(clientId);
  const serviceIds = engagements.map((e) => e.serviceId);

  const onboarding = await onboardingRepo.findByClientId(clientId);
  const company = (onboarding?.company as Partial<CompanyInput> | null) ?? null;
  const selectedObjectiveIds = (onboarding?.objectives as { selected?: string[] } | null)?.selected ?? [];
  const objectives = selectedObjectiveIds.map(
    (id) => BUSINESS_OBJECTIVES.find((o) => o.id === id)?.label ?? id,
  );

  const [performanceSnapshot, budgetSnapshot, projects] = await Promise.all([
    buildPerformanceSnapshot(clientId, "custom", { start: periodStart, end: periodEnd }),
    getBudgetForClient(clientId),
    listProjectsForClient(clientId),
  ]);

  // A monthly report has room for one project section (§8/§23 item 10;
  // the existing ClientReport.project field the Phase 11 frontend
  // consumes is singular, not a list — see report.ts) — the most
  // recently updated project is used as the representative one rather
  // than arbitrarily picking the first, so the section reflects whichever
  // project actually had activity closest to this reporting period.
  const representativeProject =
    projects.length > 0
      ? [...projects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]
      : null;

  return {
    companyName: company?.name ?? null,
    objectives,
    serviceIds,
    performanceSnapshot,
    projectSnapshot: representativeProject,
    budgetSnapshot: budgetSnapshot
      ? {
          monthlyTotal: budgetSnapshot.total,
          allocated: budgetSnapshot.allocated,
          spent: budgetSnapshot.spent,
          remaining: budgetSnapshot.remaining,
        }
      : null,
  };
}

// Admin-side: generate (or, if one already exists for this exact period
// and isn't published/archived, regenerate in place) a monthly report.
// §42's duplicate-generation protection: a period with an existing
// draft/ready report is updated, not duplicated; a period with an
// existing published report is refused outright (§26/§27 — published
// history is never silently overwritten); a period whose only existing
// report was archived is free to generate a brand new one.
export async function generateMonthlyReportForAdmin(
  clientId: ObjectId,
  monthKey: string,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  let period;
  try {
    period = resolveMonthPeriod(monthKey);
  } catch {
    return { ok: false, errors: ["Invalid reporting month."] };
  }

  const existing = await reportsRepo.findActiveByNaturalKey(clientId, "monthly", period.startDate, period.endDate);
  if (existing && existing.status === "published") {
    return {
      ok: false,
      errors: ["A published report already exists for this period. Archive it before generating a new one."],
    };
  }

  const sources = await gatherReportSources(clientId, period.startDate, period.endDate);
  const actorName = displayName(actor);

  if (existing) {
    const updated = await reportsRepo.replaceSnapshot(existing._id, sources, actor._id, actorName);
    if (!updated) return { ok: false, errors: ["Report not found."] };
    return { ok: true, data: toAdminView(updated) };
  }

  const now = new Date();
  const doc: ReportDoc = {
    _id: new ObjectId(),
    clientId,
    reportType: "monthly",
    periodStart: period.startDate,
    periodEnd: period.endDate,
    periodLabel: period.label,
    status: "draft",
    title: `Monthly Performance Report — ${period.label}`,
    ...sources,
    executiveSummary: null,
    optimizationNotes: [],
    nextMonthPlan: [],
    version: 1,
    generatedAt: now,
    generatedByUserId: actor._id,
    generatedByName: actorName,
    updatedAt: now,
    updatedByUserId: null,
    updatedByName: null,
    publishedAt: null,
    publishedByUserId: null,
    publishedByName: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now,
  };

  const created = await reportsRepo.insert(doc);
  await statusHistoryRepo.record({
    entityType: "report",
    entityId: created._id,
    clientId,
    previousStatus: null,
    newStatus: "draft",
    changedByUserId: actor._id,
    changedByRole: actor.role,
    reason: "Report generated",
  });
  return { ok: true, data: toAdminView(created) };
}

// Regeneration is only meaningful pre-publish (§26) — re-runs the exact
// same source-gathering as generation, against the report's own already-
// stored period, and bumps `version`.
export async function regenerateReportForAdmin(
  reportId: ObjectId,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  const existing = await reportsRepo.findById(reportId);
  if (!existing) return { ok: false, errors: ["Report not found."] };
  if (existing.status === "published" || existing.status === "archived") {
    return { ok: false, errors: [`A ${existing.status} report cannot be regenerated.`] };
  }

  const sources = await gatherReportSources(existing.clientId, existing.periodStart, existing.periodEnd);
  const updated = await reportsRepo.replaceSnapshot(existing._id, sources, actor._id, displayName(actor));
  if (!updated) return { ok: false, errors: ["Report not found."] };
  return { ok: true, data: toAdminView(updated) };
}

export async function updateReportContentForAdmin(
  reportId: ObjectId,
  fields: { title?: string; executiveSummary?: string; optimizationNotes?: string[]; nextMonthPlan?: string[] },
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  const existing = await reportsRepo.findById(reportId);
  if (!existing) return { ok: false, errors: ["Report not found."] };
  if (existing.status === "published" || existing.status === "archived") {
    return { ok: false, errors: [`A ${existing.status} report's content cannot be edited here.`] };
  }
  if (fields.title !== undefined && fields.title.trim().length === 0) {
    return { ok: false, errors: ["Title cannot be empty."] };
  }

  const updated = await reportsRepo.updateContent(reportId, fields, actor._id, displayName(actor));
  if (!updated) return { ok: false, errors: ["Report not found."] };
  return { ok: true, data: toAdminView(updated) };
}

async function transitionReport(
  reportId: ObjectId,
  nextStatus: ReportGenerationStatus,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
  extra: Parameters<typeof reportsRepo.updateStatus>[5] = {},
): Promise<ServiceResult<AdminReportView>> {
  const existing = await reportsRepo.findById(reportId);
  if (!existing) return { ok: false, errors: ["Report not found."] };

  if (existing.status === nextStatus) {
    return { ok: true, data: toAdminView(existing) };
  }
  if (!isValidReportTransition(existing.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a report from "${existing.status}" to "${nextStatus}".`] };
  }

  const actorName = displayName(actor);
  const updated = await reportsRepo.updateStatus(existing._id, existing.status, nextStatus, actor._id, actorName, extra);
  if (!updated) {
    return { ok: false, errors: ["This report's status just changed. Refresh and try again."] };
  }

  await statusHistoryRepo.record({
    entityType: "report",
    entityId: existing._id,
    clientId: existing.clientId,
    previousStatus: existing.status,
    newStatus: nextStatus,
    changedByUserId: actor._id,
    changedByRole: actor.role,
  });

  return { ok: true, data: toAdminView(updated) };
}

export async function markReportReadyForAdmin(
  reportId: ObjectId,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  return transitionReport(reportId, "ready", actor);
}

export async function publishReportForAdmin(
  reportId: ObjectId,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  const now = new Date();
  const result = await transitionReport(reportId, "published", actor, {
    publishedAt: now,
    publishedByUserId: actor._id,
    publishedByName: displayName(actor),
  });

  // Stage 1 Phase 22 §33 — "report published → client notification" done
  // as part of the same publish operation, not a separate droppable step.
  if (result.ok) {
    await clientNotificationsRepo.upsertForEvent({
      clientId: new ObjectId(result.data.clientId),
      type: "report_available",
      title: `New report: ${result.data.title}`,
      message: `Your ${result.data.period.label} performance report is now available.`,
      entityType: "report",
      entityId: reportId,
      href: `/dashboard/reports/${reportId.toHexString()}`,
    });
  }

  return result;
}

export async function archiveReportForAdmin(
  reportId: ObjectId,
  actor: Pick<UserDoc, "_id" | "name" | "email" | "role">,
): Promise<ServiceResult<AdminReportView>> {
  const now = new Date();
  return transitionReport(reportId, "archived", actor, {
    archivedAt: now,
    archivedByUserId: actor._id,
  });
}
