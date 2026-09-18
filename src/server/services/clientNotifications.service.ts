import "server-only";
import type { ObjectId } from "mongodb";
import { getClientEvents } from "@/server/services/clientEvents.service";
import type { ClientNotification, ClientNotificationType } from "@/shared/types/clientNotification";

const NOTIFICATION_LIMIT = 20;

// Stage 1 Phase 15 §5/§6 — real notifications, not a fixture: derived from
// the same client-safe event feed Recent Activity/Activity already use
// (statusHistory via getClientEvents), since every one of those events —
// "onboarding approved," "Meta Ads is now active" — is exactly the kind
// of thing a notification center should surface. Future event types the
// spec lists (new report, new document, new approval, message received,
// support ticket updated) have no backend yet (see approvals.service.ts/
// deliverables.service.ts/etc.) and are intentionally not fabricated here
// — they'll appear the moment those adapters have something real to
// report. `isRead` is always false: there is no backend to persist a
// read/unread flag yet, so this always reflects "never marked read
// server-side" honestly rather than faking a stored state.
function inferType(label: string): ClientNotificationType {
  if (label.toLowerCase().includes("onboarding")) return "onboarding_status_changed";
  return "service_status_changed";
}

export async function listNotificationsForClient(clientId: ObjectId): Promise<ClientNotification[]> {
  const events = await getClientEvents(clientId, NOTIFICATION_LIMIT);
  return events.map((event) => ({
    id: event.id,
    type: inferType(event.label),
    title: event.label,
    message: event.label,
    createdAt: event.occurredAt,
    isRead: false,
    href: event.href ?? "/dashboard",
  }));
}
