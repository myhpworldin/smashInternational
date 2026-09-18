import type { Role } from "@/shared/types/user";

// Stage 1 Phase 4 — one shared, generic status-transition log for every
// lifecycle this codebase tracks (onboarding submissions, service
// engagements, and whatever else needs one later), rather than a
// near-identical repo/collection duplicated per entity. Deliberately not
// folded into the existing user-management audit log
// (auditLog.repo.ts/AuditLogDoc): that schema is targetUser-shaped
// (targetUserId/targetName/targetEmail/targetRole are all required) for a
// reason — every entry there really is "something happened to this user
// account" — and an onboarding/service-engagement transition doesn't fit
// that shape without inventing a fake target user. Two lean, correctly-
// scoped logs beat one log stretched to cover both.
export type StatusHistoryEntityType = "onboarding" | "service_engagement";

export type StatusHistoryEntry = {
  id: string;
  entityType: StatusHistoryEntityType;
  entityId: string;
  clientId: string;
  previousStatus: string | null;
  newStatus: string;
  changedByUserId: string;
  changedByRole: Role;
  reason: string | null;
  changedAt: string;
};

// Display-ready row for a single entity's history list (an admin viewing
// one onboarding record's transitions) — actor resolved to an email
// rather than handing the raw id to the client to resolve itself.
export type StatusHistoryRow = {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  changedByEmail: string;
  changedByRole: Role;
  reason: string | null;
  changedAt: string;
};
