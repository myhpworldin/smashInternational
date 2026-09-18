import "server-only";
import type { ObjectId } from "mongodb";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import type { DashboardActivityItem } from "@/shared/types/dashboard";

// Stage 1 Phase 7 (extracted Phase 15 §9/§34) — the single place a
// client's real statusHistory turns into client-safe, human-readable
// events. Originally lived only inside dashboard.service.ts; pulled out
// here so the new Activity page and the Notification center can reuse
// the exact same derivation instead of a second copy of these phrasings
// drifting out of sync with the dashboard's own Recent Activity section.
function describeOnboardingTransition(newStatus: string): string | null {
  switch (newStatus) {
    case "submitted":
      return "Onboarding submitted";
    case "under_review":
      return "Your onboarding is under review";
    case "approved":
      return "Onboarding approved";
    case "changes_requested":
      return "SMASH requested changes to your onboarding";
    default:
      return null;
  }
}

function describeEngagementTransition(serviceLabel: string, newStatus: string): string | null {
  switch (newStatus) {
    case "approved":
      return `${serviceLabel} approved`;
    case "planning":
      return `${serviceLabel} moved to planning`;
    case "ready_to_start":
      return `${serviceLabel} is ready to start`;
    case "active":
      return `${serviceLabel} is now active`;
    case "paused":
      return `${serviceLabel} paused`;
    case "on_hold":
      return `${serviceLabel} put on hold`;
    case "completed":
      return `${serviceLabel} completed`;
    case "cancelled":
      return `${serviceLabel} cancelled`;
    default:
      return null;
  }
}

// `limit` is passed straight to the repo query (already indexed on
// clientId) rather than fetched-then-sliced, so a small "Recent Activity"
// call and the full Activity page's larger one both stay cheap.
export async function getClientEvents(clientId: ObjectId, limit: number): Promise<DashboardActivityItem[]> {
  const engagements = await listEngagementsForClient(clientId);
  const engagementServiceLabelById = new Map(engagements.map((e) => [e.id, e.serviceLabel]));

  const entries = await statusHistoryRepo.listByClientId(clientId, limit);
  const items: DashboardActivityItem[] = [];

  for (const entry of entries) {
    if (entry.entityType === "onboarding") {
      const label = describeOnboardingTransition(entry.newStatus);
      if (!label) continue;
      items.push({
        id: entry._id.toHexString(),
        label,
        occurredAt: entry.changedAt.toISOString(),
        href: "/dashboard/onboarding",
      });
      continue;
    }

    const engagementId = entry.entityId.toHexString();
    const label = describeEngagementTransition(engagementServiceLabelById.get(engagementId) ?? "A service", entry.newStatus);
    if (!label) continue;
    items.push({
      id: entry._id.toHexString(),
      label,
      occurredAt: entry.changedAt.toISOString(),
      href: `/dashboard/services/${engagementId}`,
    });
  }

  return items;
}
