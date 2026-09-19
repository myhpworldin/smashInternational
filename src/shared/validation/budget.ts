import * as z from "zod/mini";

export const setBudgetTotalSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  total: z.number().check(z.gte(0)),
});

// One row per service — `id` is the service's real serviceId (from the
// client's own selected services / live engagements), never free text, so
// an allocation is always tied to an actual service rather than an
// arbitrary label someone typed.
export const budgetAllocationInputSchema = z.object({
  id: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
  allocated: z.number().check(z.gte(0)),
});

// The sum-may-not-exceed-total rule is enforced here too (not only at the
// service layer) so a malformed/tampered request is rejected before ever
// reaching the database — same defense-in-depth as every other schema in
// this codebase that both the client and the server independently check.
export const setBudgetAllocationsSchema = z
  .object({
    clientId: z.string().check(z.trim(), z.minLength(1)),
    total: z.number().check(z.gte(0)),
    allocations: z.array(budgetAllocationInputSchema).check(z.maxLength(50)),
  })
  .check(
    z.refine((val) => {
      const allocated = val.allocations.reduce((sum, a) => sum + a.allocated, 0);
      return allocated <= val.total;
    }, "Allocated amounts can't exceed the total budget."),
  );

export const createBudgetChangeRequestSchema = z.object({
  channelName: z.optional(z.string().check(z.trim(), z.maxLength(100))),
  campaignName: z.optional(z.string().check(z.trim(), z.maxLength(200))),
  requestedAllocation: z.number().check(z.gte(0)),
  reason: z.string().check(z.trim(), z.minLength(1), z.maxLength(1000)),
});

export const reviewBudgetChangeRequestSchema = z.object({
  reviewNote: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
});
