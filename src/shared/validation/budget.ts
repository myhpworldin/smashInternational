import * as z from "zod/mini";

export const setBudgetTotalSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  total: z.number().check(z.gte(0)),
});

export const createBudgetChangeRequestSchema = z.object({
  channelName: z.optional(z.string().check(z.trim(), z.maxLength(100))),
  campaignName: z.optional(z.string().check(z.trim(), z.maxLength(200))),
  requestedAllocation: z.number().check(z.gte(0)),
  reason: z.string().check(z.trim(), z.minLength(1), z.maxLength(1000)),
});

export const reviewBudgetChangeRequestSchema = z.object({
  reviewNote: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
});
