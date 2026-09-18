import * as z from "zod/mini";

export const createServiceAssignmentSchema = z.object({
  onboardingId: z.string().check(z.trim(), z.minLength(1)),
  serviceId: z.string().check(z.trim(), z.minLength(1)),
  staffUserId: z.string().check(z.trim(), z.minLength(1)),
});

export type CreateServiceAssignmentInput = z.infer<typeof createServiceAssignmentSchema>;

export const transferAssignmentSchema = z.object({
  staffUserId: z.string().check(z.trim(), z.minLength(1)),
  // Free text, same reasoning as staffAvailability's reason field — the
  // UI offers a quick-pick list of canned reasons (Staff left company,
  // Workload balancing, etc.) but the backend just stores whatever string
  // it's handed, never required.
  reason: z.optional(z.string().check(z.trim(), z.maxLength(500))),
});

export type TransferAssignmentInput = z.infer<typeof transferAssignmentSchema>;
