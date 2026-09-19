import "server-only";
import { ObjectId } from "mongodb";
import * as clientNotificationsRepo from "@/server/repositories/clientNotifications.repo";
import { getClientEvents } from "@/server/services/clientEvents.service";
import type { ClientNotification, ClientNotificationType } from "@/shared/types/clientNotification";

// Stage 1 Phase 15 §5/§6, real read-state added Phase 22 §20-§23 — two
// sources merged into one feed, newest first:
//
// 1. The original statusHistory-derived events (onboarding/service-
//    engagement transitions) — real, but with no persisted read/unread
//    flag (there's nothing to mark read against; `isRead` stays honestly
//    false forever for these, a disclosed, unchanged limitation).
// 2. The new persisted clientNotifications collection (approval/
//    deliverable/report/document/support-ticket events), which DOES
//    support real mark-as-read (see markNotificationRead/
//    getUnreadCountForClient below).
//
// This is a deliberate merge, not a migration: the derived events aren't
// backfilled into the persisted collection, so re-deriving them here
// forever is intentional, not a leftover.
const DERIVED_LIMIT = 20;

function inferType(label: string): ClientNotificationType {
  if (label.toLowerCase().includes("onboarding")) return "onboarding_status_changed";
  return "service_status_changed";
}

export async function listNotificationsForClient(clientId: ObjectId): Promise<ClientNotification[]> {
  const [derivedEvents, persisted] = await Promise.all([
    getClientEvents(clientId, DERIVED_LIMIT),
    clientNotificationsRepo.listByClientId(clientId),
  ]);

  const derived: ClientNotification[] = derivedEvents.map((event) => ({
    id: event.id,
    type: inferType(event.label),
    title: event.label,
    message: event.label,
    createdAt: event.occurredAt,
    isRead: false,
    href: event.href ?? "/dashboard",
  }));

  const real: ClientNotification[] = persisted.map((doc) => ({
    id: doc._id.toHexString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
    isRead: doc.isRead,
    href: doc.href,
  }));

  return [...real, ...derived].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Only the persisted collection has a real unread count — the derived
// feed has no read-state to count against, so it's excluded here rather
// than always reporting itself as unread and inflating the badge forever.
export async function getUnreadCountForClient(clientId: ObjectId): Promise<number> {
  return clientNotificationsRepo.countUnread(clientId);
}

export type MarkNotificationReadResult = { ok: true } | { ok: false; errors: string[] };

export async function markNotificationReadForClient(
  notificationId: string,
  clientId: ObjectId,
): Promise<MarkNotificationReadResult> {
  if (!ObjectId.isValid(notificationId)) return { ok: false, errors: ["Notification not found."] };
  const marked = await clientNotificationsRepo.markRead(new ObjectId(notificationId), clientId);
  if (!marked) return { ok: false, errors: ["Notification not found."] };
  return { ok: true };
}

export async function markAllNotificationsReadForClient(clientId: ObjectId): Promise<void> {
  await clientNotificationsRepo.markAllRead(clientId);
}
