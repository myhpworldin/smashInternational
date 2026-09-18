import "server-only";
import type { ObjectId } from "mongodb";

// Stage 1 Phase 16 §6 — the one centralized "does this record belong to
// the authenticated client" check. Every client-owned-resource lookup in
// this codebase (today: service engagements via
// serviceEngagements.service.ts's getEngagementForClient, and the
// onboarding-asset file route) should use this instead of repeating its
// own inline `!doc || !doc.clientId.equals(clientId)` — and every future
// backend phase's equivalent lookup (projects, campaigns, reports,
// approvals, deliverables, documents, conversations, support tickets —
// currently honest-empty stubs in server/services/*.service.ts) should
// adopt it the moment it has a real document to check, rather than each
// growing its own slightly-different ownership check.
//
// Deliberately returns a boolean rather than throwing: callers that need
// a page-style 404 (via Next's notFound()) and callers that need an API
// 401/403 JSON response both build on the same primitive without this
// module needing to know which.
export function isOwnedByClient(recordClientId: ObjectId | null | undefined, sessionClientId: ObjectId): boolean {
  return Boolean(recordClientId) && recordClientId!.equals(sessionClientId);
}

// Convenience wrapper for the common "fetch by id, return null unless it
// belongs to this client" shape — collapses a nonexistent record and one
// that exists but belongs to someone else into the same `null` result, so
// a caller (and, in turn, an API response or a 404 page) never leaks
// which case it was.
export function assertClientOwnership<T extends { clientId: ObjectId }>(
  record: T | null,
  sessionClientId: ObjectId,
): T | null {
  if (!record || !isOwnedByClient(record.clientId, sessionClientId)) return null;
  return record;
}
