import * as z from "zod/mini";

const STAFF_AVAILABILITY_VALUES = ["available", "on_leave", "unavailable", "departed"] as const;

export const changeStaffAvailabilitySchema = z.object({
  availability: z.enum(STAFF_AVAILABILITY_VALUES),
  // Only meaningful when moving away from "available" — the admin's note
  // on why (e.g. "resigned", "2-week leave from 12 Sep"). Never required:
  // the handover-required side effect must not be blocked on someone
  // typing a reason.
  reason: z.optional(z.string().check(z.trim(), z.maxLength(500))),
});

export type ChangeStaffAvailabilityInput = z.infer<typeof changeStaffAvailabilitySchema>;
