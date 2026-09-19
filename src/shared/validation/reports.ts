import * as z from "zod/mini";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// Stage 1 Phase 21 — a monthly report is always generated for one named
// calendar month (never "the current month" implicitly), so an admin can
// generate September's report while sitting in October. `periodKey` is
// still accepted for forward compatibility with other report types this
// phase doesn't implement a generator for yet, but monthly generation
// only ever reads `monthKey`.
export const generateReportSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  reportType: z.literal("monthly"),
  monthKey: z.string().check(z.regex(MONTH_KEY_PATTERN)),
});

export const updateReportSchema = z.object({
  title: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(200))),
  executiveSummary: z.optional(z.string().check(z.trim(), z.maxLength(4000))),
  optimizationNotes: z.optional(z.array(z.string().check(z.trim(), z.minLength(1), z.maxLength(1000))).check(z.maxLength(50))),
  nextMonthPlan: z.optional(z.array(z.string().check(z.trim(), z.minLength(1), z.maxLength(1000))).check(z.maxLength(50))),
});
