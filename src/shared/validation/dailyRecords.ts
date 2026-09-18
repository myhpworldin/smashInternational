import * as z from "zod/mini";

// Stage 1 Phase 19 — metrics/projectProgress values arrive as loosely-typed
// numeric records from DailyDataEntryClient (§13/§30: keys vary per
// service's metric group, never a fixed field list) — validated shape-wise
// here (finite, non-negative numbers only), then checked field-by-field
// against the service's actual metric group at the service layer, the same
// split onboarding.ts's dynamic `responses` record already uses.
const metricsSchema = z.record(z.string(), z.number().check(z.gte(0)));

const projectProgressSchema = z.object({
  overallProgress: z.optional(z.number().check(z.gte(0), z.lte(100))),
  status: z.optional(z.string().check(z.trim(), z.maxLength(200))),
});

// reportingDate is validated only as a plain YYYY-MM-DD string here (never
// coerced to a Date) — see dailyPerformanceRecords.repo.ts for why storing
// it as anything else risks timezone drift.
const reportingDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const saveDailyRecordSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  serviceId: z.string().check(z.trim(), z.minLength(1)),
  campaignOrProjectId: z.nullable(z.string().check(z.trim(), z.minLength(1))),
  reportingDate: z.string().check(z.regex(reportingDatePattern)),
  metrics: z.optional(metricsSchema),
  projectProgress: z.optional(z.nullable(projectProgressSchema)),
  notes: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
});

export type SaveDailyRecordInput = z.infer<typeof saveDailyRecordSchema>;
