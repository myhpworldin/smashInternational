import * as z from "zod/mini";

const CAMPAIGN_STATUS_VALUES = [
  "planning",
  "approval",
  "live",
  "optimizing",
  "paused",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const createCampaignSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  serviceEngagementId: z.string().check(z.trim(), z.minLength(1)),
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  platform: z.optional(z.string().check(z.trim(), z.maxLength(100))),
  objective: z.optional(z.string().check(z.trim(), z.maxLength(200))),
  status: z.enum(CAMPAIGN_STATUS_VALUES),
  startDate: z.optional(z.string().check(z.minLength(1))),
  endDate: z.optional(z.string().check(z.minLength(1))),
  budget: z.optional(z.number().check(z.gte(0))),
  spend: z.optional(z.number().check(z.gte(0))),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignStatusSchema = z.object({
  status: z.enum(CAMPAIGN_STATUS_VALUES),
});

export const updateCampaignFinancialsSchema = z.object({
  budget: z.optional(z.number().check(z.gte(0))),
  spend: z.optional(z.number().check(z.gte(0))),
});
