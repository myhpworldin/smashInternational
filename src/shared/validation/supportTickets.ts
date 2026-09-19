import * as z from "zod/mini";

const PRIORITY_VALUES = ["low", "medium", "high"] as const;
const STATUS_VALUES = ["open", "assigned", "in_progress", "waiting_for_client", "resolved", "closed"] as const;

export const createSupportTicketSchema = z.object({
  subject: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  serviceId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  description: z.string().check(z.trim(), z.minLength(1), z.maxLength(5000)),
  priority: z.optional(z.enum(PRIORITY_VALUES)),
});

export const addSupportMessageSchema = z.object({
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(5000)),
});

export const updateSupportTicketStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
});
