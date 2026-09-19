import * as z from "zod/mini";

export const createApprovalSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  serviceId: z.string().check(z.trim(), z.minLength(1)),
  projectId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  campaignId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  deliverableId: z.optional(z.string().check(z.trim(), z.minLength(1))),
  title: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  description: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  approvalType: z.string().check(z.trim(), z.minLength(1), z.maxLength(50)),
  previewUrl: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
});

export const requestApprovalChangesSchema = z.object({
  comment: z.string().check(z.trim(), z.minLength(1), z.maxLength(2000)),
});

export const resubmitApprovalSchema = z.object({
  title: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(200))),
  description: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  previewUrl: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
});
