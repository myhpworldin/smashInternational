import * as z from "zod/mini";

// Mirrors SERVICE_ENGAGEMENT_STATUSES (shared/types/serviceEngagement.ts)
// as an `as const` tuple — z.enum needs the literal-tuple shape, which a
// `readonly ServiceEngagementStatus[]` doesn't give it. Same pattern as
// OBJECTIVE_VALUES/AGE_GROUP_VALUES etc. in validation/onboarding.ts.
const SERVICE_ENGAGEMENT_STATUS_VALUES = [
  "requested",
  "under_review",
  "approved",
  "planning",
  "ready_to_start",
  "active",
  "paused",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const updateServiceEngagementStatusSchema = z.object({
  status: z.enum(SERVICE_ENGAGEMENT_STATUS_VALUES),
  // Optional, same reasoning as transferAssignmentSchema's reason field —
  // useful context (e.g. why a service was paused) but never required by
  // the backend.
  reason: z.optional(z.string().check(z.trim(), z.maxLength(500))),
});

export type UpdateServiceEngagementStatusInput = z.infer<typeof updateServiceEngagementStatusSchema>;
