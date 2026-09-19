import "server-only";
import type { ObjectId } from "mongodb";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import type { DashboardActivityItem } from "@/shared/types/dashboard";

// Stage 1 Phase 7 (extracted Phase 15 §9/§34, extended Phase 21/22 §24/
// §25/§33) — the single place a client's real statusHistory turns into
// client-safe, human-readable events. Originally lived only inside
// dashboard.service.ts; pulled out here so the Activity page, the
// dashboard's Recent Activity section, and the Notification center all
// reuse the exact same derivation instead of separate copies of these
// phrasings drifting out of sync. Every entity type statusHistory can
// carry (shared/types/statusHistory.ts) gets its own explicit branch
// below — an entity this function doesn't yet recognize is skipped
// rather than misread as some other kind (the bug this rewrite fixes:
// the previous version silently treated every non-onboarding entry as a
// service-engagement one, which happened to no-op harmlessly for
// Phase 21's new "report" entries but was never actually correct).
// `changedByRole` distinguishes a client's own submission from one an
// admin completed on their behalf (Stage 1 Phase 29) — the one place this
// client-visible feed needs to say so explicitly (PDF §20: the client
// should be told, in neutral wording, that SMASH completed this for
// them), reusing the statusHistory entry's own existing changedByRole
// field rather than a second flag anywhere.
function describeOnboardingTransition(newStatus: string, changedByRole?: string): string | null {
  switch (newStatus) {
    case "submitted":
      return changedByRole === "admin"
        ? "Your onboarding was completed by the SMASH team and is now under review"
        : "Onboarding submitted";
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

function describeReportTransition(newStatus: string): string | null {
  return newStatus === "published" ? "A new performance report is available" : null;
}

function describeApprovalTransition(newStatus: string): string | null {
  switch (newStatus) {
    case "awaiting_client":
      return "A new item is ready for your review";
    case "approved":
      return "You approved an item";
    case "changes_requested":
      return "You requested changes to an item";
    default:
      return null;
  }
}

function describeDeliverableTransition(newStatus: string): string | null {
  return newStatus === "ready_for_review" ? "A deliverable is ready for review" : null;
}

function describeSupportTicketTransition(newStatus: string): string | null {
  switch (newStatus) {
    case "open":
      return "Support ticket created";
    case "resolved":
      return "Support ticket resolved";
    case "closed":
      return "Support ticket closed";
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
    switch (entry.entityType) {
      case "onboarding": {
        const label = describeOnboardingTransition(entry.newStatus, entry.changedByRole);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: "/dashboard/onboarding" });
        break;
      }
      case "service_engagement": {
        const engagementId = entry.entityId.toHexString();
        const label = describeEngagementTransition(engagementServiceLabelById.get(engagementId) ?? "A service", entry.newStatus);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: `/dashboard/services/${engagementId}` });
        break;
      }
      case "report": {
        const label = describeReportTransition(entry.newStatus);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: "/dashboard/reports" });
        break;
      }
      case "approval": {
        const label = describeApprovalTransition(entry.newStatus);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: `/dashboard/approvals/${entry.entityId.toHexString()}` });
        break;
      }
      case "deliverable": {
        const label = describeDeliverableTransition(entry.newStatus);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: `/dashboard/deliverables/${entry.entityId.toHexString()}` });
        break;
      }
      case "support_ticket": {
        const label = describeSupportTicketTransition(entry.newStatus);
        if (label) items.push({ id: entry._id.toHexString(), label, occurredAt: entry.changedAt.toISOString(), href: `/dashboard/support/${entry.entityId.toHexString()}` });
        break;
      }
      default:
        break;
    }
  }

  return items;
}
