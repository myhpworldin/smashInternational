import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { PerformanceMetrics } from "@/shared/types/performance";
import type { DailyProjectProgress, DailyRecordSource } from "@/shared/types/dailyRecord";

const COLLECTION = "dailyPerformanceRecords";

// Stage 1 Phase 19 — the raw daily-record source of truth (§38: "create
// the reliable raw daily performance source of truth first" — the client
// dashboard, reports, and future analytics all read from this same
// collection, never a second dashboard-shaped copy).
//
// reportingDate is stored as a plain "YYYY-MM-DD" string, not a Date
// (§27's explicit warning: a Date object round-tripped through timezone
// conversion can silently shift a date-only value to the day before/after
// depending on the server/client timezone; a string can't drift). Every
// other timestamp (createdAt/updatedAt) is a real Date, since those are
// genuine instants, not date-only business values.
//
// Recommended indexes: { clientId: 1, serviceId: 1, campaignOrProjectId: 1,
// reportingDate: 1 } (unique — the natural key from §12), { clientId: 1,
// reportingDate: 1 }. Stage 1 Phase 20 §30 adds two more to serve
// aggregateRange/aggregateDailyBuckets' real query shapes: { clientId: 1,
// serviceId: 1, reportingDate: 1 } (service-level date-range aggregation)
// and { campaignOrProjectId: 1, reportingDate: 1 } (campaign/project-level
// analysis, which filters by that id directly without a clientId prefix).
export type DailyPerformanceRecordDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  // Polymorphic on purpose (§9/§11): a campaign for advertising/lead
  // services, a project for creative/technology ones. Never both, and
  // `null` (not omitted) when the record is scoped to the service
  // directly with no specific campaign/project — see the uniqueness
  // index comment above for why `null` must be an explicit, indexable
  // value here rather than a missing field.
  campaignOrProjectId: ObjectId | null;
  campaignOrProjectLabel: string | null;
  reportingDate: string;
  metrics: PerformanceMetrics;
  projectProgress: DailyProjectProgress | null;
  notes: string | null;
  source: DailyRecordSource;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: ObjectId;
  updatedByUserId: ObjectId;
  // Denormalized display name (§16's "updatedByName" the frontend already
  // renders) — same convention as auditLog/serviceAssignments' actorName:
  // resolved once at write time rather than joined against users on every
  // read.
  updatedByName: string;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<DailyPerformanceRecordDoc>(COLLECTION);
}

// The one write path (§26: "handle repeated saves safely... update the
// existing record when it already exists"). Atomic upsert on the natural
// key — no separate find-then-insert/update race window. `$setOnInsert`
// is the only place createdAt/createdByUserId are ever written, so a
// historical correction (§14/§15) can never disturb them; `$set` always
// stamps a fresh updatedAt/updatedByUserId, and reportingDate is only
// ever part of the filter, never something this function's caller can
// use to move an existing record to a different date.
export async function upsert(input: {
  clientId: ObjectId;
  serviceEngagementId: ObjectId;
  serviceId: string;
  campaignOrProjectId: ObjectId | null;
  campaignOrProjectLabel: string | null;
  reportingDate: string;
  metrics: PerformanceMetrics;
  projectProgress: DailyProjectProgress | null;
  notes: string | null;
  actorUserId: ObjectId;
  actorName: string;
}): Promise<DailyPerformanceRecordDoc> {
  const now = new Date();
  const result = await (await collection()).findOneAndUpdate(
    {
      clientId: input.clientId,
      serviceId: input.serviceId,
      campaignOrProjectId: input.campaignOrProjectId,
      reportingDate: input.reportingDate,
    },
    {
      $set: {
        serviceEngagementId: input.serviceEngagementId,
        campaignOrProjectLabel: input.campaignOrProjectLabel,
        metrics: input.metrics,
        projectProgress: input.projectProgress,
        notes: input.notes,
        source: "manual_admin_entry" as DailyRecordSource,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
        updatedByName: input.actorName,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
        createdByUserId: input.actorUserId,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function findById(id: ObjectId): Promise<DailyPerformanceRecordDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<DailyPerformanceRecordDoc[]> {
  return (await collection()).find({ clientId }).sort({ reportingDate: -1 }).toArray();
}

export async function findExisting(
  clientId: ObjectId,
  serviceId: string,
  campaignOrProjectId: ObjectId | null,
  reportingDate: string,
): Promise<DailyPerformanceRecordDoc | null> {
  return (await collection()).findOne({ clientId, serviceId, campaignOrProjectId, reportingDate });
}

export type DailyRecordFilter = {
  clientId: ObjectId;
  serviceId?: string;
  campaignOrProjectId?: ObjectId | null;
  startDate: string;
  endDate: string;
};

function filterToMatch(filter: DailyRecordFilter): Record<string, unknown> {
  const match: Record<string, unknown> = {
    clientId: filter.clientId,
    reportingDate: { $gte: filter.startDate, $lte: filter.endDate },
  };
  if (filter.serviceId !== undefined) match.serviceId = filter.serviceId;
  if (filter.campaignOrProjectId !== undefined) match.campaignOrProjectId = filter.campaignOrProjectId;
  return match;
}

// Stage 1 Phase 20 §29/§35 — one metric field's contribution to a $group
// stage: `sum` totals the present values, `present` counts how many
// matched documents actually defined this field at all. Post-processing
// (aggregateRange/aggregateDailyBuckets below) uses `present === 0` to
// return `null` for a metric never once recorded in the range, rather than
// a misleading `0` (§26/§27's "no data" vs "zero" distinction, which a
// bare $sum can't express on its own since it treats an absent field the
// same as zero contribution).
function metricAccumulators(metricKeys: string[]): Record<string, unknown> {
  const stage: Record<string, unknown> = {};
  for (const key of metricKeys) {
    stage[`sum_${key}`] = { $sum: { $ifNull: [`$metrics.${key}`, 0] } };
    stage[`present_${key}`] = { $sum: { $cond: [{ $ifNull: [`$metrics.${key}`, false] }, 1, 0] } };
  }
  return stage;
}

function extractMetrics(row: Record<string, unknown>, metricKeys: string[]): Record<string, number | null> {
  const metrics: Record<string, number | null> = {};
  for (const key of metricKeys) {
    const present = (row[`present_${key}`] as number) ?? 0;
    metrics[key] = present > 0 ? (row[`sum_${key}`] as number) : null;
  }
  return metrics;
}

export type RangeAggregation = {
  metrics: Record<string, number | null>;
  recordCount: number;
  latestUpdatedAt: Date | null;
  latestReportingDate: string | null;
};

// Single-bucket range total (§7/§9-11) — one MongoDB aggregation, never a
// raw-document fetch into application memory (§29).
export async function aggregateRange(filter: DailyRecordFilter, metricKeys: string[]): Promise<RangeAggregation> {
  const rows = await (await collection())
    .aggregate([
      { $match: filterToMatch(filter) },
      {
        $group: {
          _id: null,
          recordCount: { $sum: 1 },
          latestUpdatedAt: { $max: "$updatedAt" },
          latestReportingDate: { $max: "$reportingDate" },
          ...metricAccumulators(metricKeys),
        },
      },
    ])
    .toArray();

  const row = rows[0];
  if (!row) {
    return {
      metrics: Object.fromEntries(metricKeys.map((k) => [k, null])),
      recordCount: 0,
      latestUpdatedAt: null,
      latestReportingDate: null,
    };
  }

  return {
    metrics: extractMetrics(row, metricKeys),
    recordCount: row.recordCount as number,
    latestUpdatedAt: (row.latestUpdatedAt as Date) ?? null,
    latestReportingDate: (row.latestReportingDate as string) ?? null,
  };
}

export type DailyBucket = {
  reportingDate: string;
  metrics: Record<string, number | null>;
  recordCount: number;
};

// §14 — chronologically ordered trend buckets (one per reportingDate that
// has at least one matching record — a day with zero matching records is
// simply absent, never synthesized as a zero-filled row here; callers that
// need every calendar day represented, e.g. for a chart's x-axis, fill the
// gaps themselves from this sparse list).
export async function aggregateDailyBuckets(filter: DailyRecordFilter, metricKeys: string[]): Promise<DailyBucket[]> {
  const rows = await (await collection())
    .aggregate([
      { $match: filterToMatch(filter) },
      {
        $group: {
          _id: "$reportingDate",
          recordCount: { $sum: 1 },
          ...metricAccumulators(metricKeys),
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    reportingDate: row._id as string,
    metrics: extractMetrics(row, metricKeys),
    recordCount: row.recordCount as number,
  }));
}
