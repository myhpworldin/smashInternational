import * as z from "zod/mini";

const STATUS_VALUES = [
  "draft",
  "in_progress",
  "ready_for_review",
  "waiting_for_approval",
  "approved",
  "changes_requested",
  "completed",
  "delivered",
] as const;

export const createDeliverableSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  serviceId: z.string().check(z.trim(), z.minLength(1)),
  projectId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  campaignId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  title: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  description: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  type: z.string().check(z.trim(), z.minLength(1), z.maxLength(50)),
  status: z.optional(z.enum(STATUS_VALUES)),
  previewUrl: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  dueDate: z.optional(z.string().check(z.minLength(1))),
});

export const updateDeliverableStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
});
