import * as z from "zod/mini";

export const sendMessageSchema = z.object({
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(5000)),
});

const RELATED_TYPE_VALUES = ["service", "project", "campaign", "support_ticket"] as const;

export const createConversationSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  subject: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  serviceId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  relatedEntityType: z.optional(z.enum(RELATED_TYPE_VALUES)),
  relatedEntityId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  message: z.string().check(z.trim(), z.minLength(1), z.maxLength(5000)),
});
