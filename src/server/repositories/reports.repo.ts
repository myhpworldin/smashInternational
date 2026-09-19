import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ReportType } from "@/shared/types/report";
import type { ReportGenerationStatus } from "@/shared/types/report";
import type { PerformanceSnapshot } from "@/shared/types/performance";
import type { ClientProject } from "@/shared/types/project";

const COLLECTION = "reports";

// Stage 1 Phase 21 — the report snapshot decision (§25): once a report is
// generated, its calculated numbers are frozen onto this document rather
// than the client-facing page recomputing them live from daily records on
// every read. A published September report must keep reading "45 leads"
// forever, even if an admin corrects an unrelated August record in
// October and the analytics engine's live numbers shift — recomputing on
// read would silently rewrite history. Regeneration (draft/ready only,
// see reports.service.ts) explicitly re-runs the snapshot and increments
// `version`; a published report can never be regenerated in place.
//
// Recommended indexes: { clientId: 1, reportType: 1, periodStart: 1,
// periodEnd: 1 } (the natural key — duplicate-generation protection is
// enforced at the application level, not a unique index, since an
// archived report intentionally frees its period for a fresh one — see
// reports.service.ts), { clientId: 1, status: 1 } (the client-facing
// "published only" list query).
export type ReportDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  status: ReportGenerationStatus;
  title: string;
  companyName: string | null;
  objectives: string[];
  serviceIds: string[];
  // The frozen calculated snapshot — same shapes the Phase 10/17 frontend
  // already consumes, so getReportForClient needs zero translation beyond
  // reading these fields back.
  performanceSnapshot: PerformanceSnapshot | null;
  projectSnapshot: ClientProject | null;
  budgetSnapshot: { monthlyTotal: number; allocated?: number; spent?: number; remaining?: number } | null;
  // Staff-authored commentary, kept structurally separate from the
  // calculated snapshot above (§38) — never derived, never auto-written.
  executiveSummary: string | null;
  optimizationNotes: string[];
  nextMonthPlan: string[];
  version: number;
  generatedAt: Date;
  generatedByUserId: ObjectId;
  generatedByName: string;
  updatedAt: Date;
  updatedByUserId: ObjectId | null;
  updatedByName: string | null;
  publishedAt: Date | null;
  publishedByUserId: ObjectId | null;
  publishedByName: string | null;
  archivedAt: Date | null;
  archivedByUserId: ObjectId | null;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ReportDoc>(COLLECTION);
}

export async function findById(id: ObjectId): Promise<ReportDoc | null> {
  return (await collection()).findOne({ _id: id });
}

// The natural-key lookup duplicate-generation protection is built on
// (§42) — deliberately excludes archived reports, so a withdrawn report
// never blocks a fresh one from being generated for the same period.
export async function findActiveByNaturalKey(
  clientId: ObjectId,
  reportType: ReportType,
  periodStart: string,
  periodEnd: string,
): Promise<ReportDoc | null> {
  return (await collection()).findOne({
    clientId,
    reportType,
    periodStart,
    periodEnd,
    status: { $ne: "archived" },
  });
}

export async function insert(doc: ReportDoc): Promise<ReportDoc> {
  await (await collection()).insertOne(doc);
  return doc;
}

// Regeneration in place (draft/ready only — enforced by the caller, never
// here) — replaces the calculated snapshot and bumps `version`, but never
// touches generatedAt/generatedByUserId (the original generation act) or
// any of the publish/archive metadata.
export async function replaceSnapshot(
  id: ObjectId,
  fields: {
    performanceSnapshot: PerformanceSnapshot | null;
    projectSnapshot: ClientProject | null;
    budgetSnapshot: ReportDoc["budgetSnapshot"];
    companyName: string | null;
    objectives: string[];
    serviceIds: string[];
  },
  actorUserId: ObjectId,
  actorName: string,
): Promise<ReportDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id },
    {
      $set: { ...fields, updatedAt: new Date(), updatedByUserId: actorUserId, updatedByName: actorName },
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  );
}

export async function updateContent(
  id: ObjectId,
  fields: { title?: string; executiveSummary?: string; optimizationNotes?: string[]; nextMonthPlan?: string[] },
  actorUserId: ObjectId,
  actorName: string,
): Promise<ReportDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id },
    { $set: { ...fields, updatedAt: new Date(), updatedByUserId: actorUserId, updatedByName: actorName } },
    { returnDocument: "after" },
  );
}

// Conditioned on the report still being exactly at `fromStatus` — the
// same concurrency guard every other status-transition repo in this
// codebase uses (serviceEngagements/projects/campaigns).
export async function updateStatus(
  id: ObjectId,
  fromStatus: ReportGenerationStatus,
  toStatus: ReportGenerationStatus,
  actorUserId: ObjectId,
  actorName: string,
  extra: Partial<Pick<ReportDoc, "publishedAt" | "publishedByUserId" | "publishedByName" | "archivedAt" | "archivedByUserId">> = {},
): Promise<ReportDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    {
      $set: {
        status: toStatus,
        updatedAt: new Date(),
        updatedByUserId: actorUserId,
        updatedByName: actorName,
        ...extra,
      },
    },
    { returnDocument: "after" },
  );
}

export async function listByClientForAdmin(clientId: ObjectId): Promise<ReportDoc[]> {
  return (await collection()).find({ clientId }).sort({ periodStart: -1 }).toArray();
}

// Client-facing: published only (§30) — a draft/ready/archived report's id
// simply never matches this filter, the same "doesn't exist vs. not yours"
// non-disclosure pattern used everywhere else in this codebase.
export async function listPublishedByClientId(clientId: ObjectId): Promise<ReportDoc[]> {
  return (await collection()).find({ clientId, status: "published" }).sort({ periodStart: -1 }).toArray();
}

export async function findPublishedByIdAndClient(id: ObjectId, clientId: ObjectId): Promise<ReportDoc | null> {
  return (await collection()).findOne({ _id: id, clientId, status: "published" });
}
