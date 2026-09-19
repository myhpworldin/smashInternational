import type { AdminUserStatus, StaffAvailability } from "@/shared/types/adminUser";

// One row per staff member currently unable to continue active work
// (Phase 5 §4/§5). `pendingCount` + `transferredCount` = the total number
// of assignments they held at the moment they became unavailable — real
// counts derived from serviceAssignments (still handover_required) and
// completed assignmentHandovers rows (already moved on), never a fabricated
// total.
export type PendingHandoverStaffRow = {
  staffUserId: string;
  name: string;
  email: string;
  status: AdminUserStatus;
  availability: StaffAvailability;
  pendingCount: number;
  transferredCount: number;
  // pendingCount === 0 but transferredCount > 0 — every assignment this
  // staff member held has been handed over (Phase 5 §18). false when
  // there was never anything to hand over at all (Phase 5 §19).
  handoverComplete: boolean;
  earliestHandoverRequiredAt: string | null;
};

export type HandoverSummary = {
  pendingStaffCount: number;
  pendingAssignmentCount: number;
  affectedServiceCount: number;
  affectedClientCount: number;
  completedHandoverCount: number;
  // Stage 1 Phase 28 §29/§30 — distinct from the pending-handover figures
  // above: a live service engagement that was never assigned to anyone
  // in the first place, not one that lost its owner.
  unassignedActiveServiceCount: number;
};

export type CompletedHandoverRow = {
  id: string;
  clientCompanyName: string;
  serviceId: string;
  serviceLabel: string;
  previousStaffName: string;
  newStaffName: string;
  transferredByName: string;
  transferredAt: string;
  reason: string | null;
};
