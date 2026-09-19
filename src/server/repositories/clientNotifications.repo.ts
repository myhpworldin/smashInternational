import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { ClientNotificationType } from "@/shared/types/clientNotification";

const COLLECTION = "clientNotifications";

// Stage 1 Phase 22 §20/§49 — a persisted, per-client notification store
// with a real read/unread flag, closing the one gap Phase 15's
// clientNotifications.service.ts explicitly disclosed ("no backend to
// persist a read/unread flag yet — this always reflects 'never marked
// read server-side'"). This is a deliberate, documented decision NOT to
// force these events into the existing `notifications` collection
// (notifications.repo.ts): that collection's schema requires
// assignmentId/onboardingId/serviceId on every row because it exists for
// exactly one domain (staff service-assignment handovers, Phase 4) —
// bending it to also carry approval/deliverable/report/support-ticket
// events would mean inventing fake ids for fields that don't apply,
// which is worse than a second, correctly-scoped collection following
// the exact same repo pattern (create/listForRecipient-equivalent/
// markRead). This mirrors the precedent Phase 4 already set keeping
// `statusHistory` separate from the target-user-shaped admin audit log
// for the identical reason, reused again by Phase 21 for reports.
//
// Deliberately does NOT replace the existing statusHistory-derived
// onboarding/service-engagement notifications in
// clientNotifications.service.ts — those two event types still come from
// the same real, already-working source they always have; this
// collection only backs the five newer event types this phase adds
// (approval/deliverable/document/report/support-ticket), each written at
// the exact point the underlying business action happens (§34's
// "notification creation should happen as part of the same business
// operation," not a separate unreliable step).
//
// Recommended indexes: { clientId: 1, createdAt: -1 }, { clientId: 1,
// isRead: 1 }.
export type ClientNotificationDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  type: ClientNotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: ObjectId;
  href: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ClientNotificationDoc>(COLLECTION);
}

// Idempotent per (clientId, type, entityType, entityId) — §23's
// duplicate-notification prevention: re-processing the same business
// event (e.g. a retried request re-publishing the "same" report) updates
// the existing notification's timestamp/read-state reset rather than
// inserting a second row for the same underlying event.
export async function upsertForEvent(input: {
  clientId: ObjectId;
  type: ClientNotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: ObjectId;
  href: string;
}): Promise<void> {
  await (await collection()).updateOne(
    { clientId: input.clientId, type: input.type, entityType: input.entityType, entityId: input.entityId },
    {
      $set: {
        title: input.title,
        message: input.message,
        href: input.href,
        isRead: false,
        readAt: null,
      },
      $setOnInsert: { _id: new ObjectId(), createdAt: new Date() },
    },
    { upsert: true },
  );
}

export async function listByClientId(clientId: ObjectId, limit = 50): Promise<ClientNotificationDoc[]> {
  return (await collection()).find({ clientId }).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function countUnread(clientId: ObjectId): Promise<number> {
  return (await collection()).countDocuments({ clientId, isRead: false });
}

// Scoped to the client in the filter itself (same pattern as
// notifications.repo.ts's markRead) — a client can never mark another
// client's notification read by guessing an id.
export async function markRead(id: ObjectId, clientId: ObjectId): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { _id: id, clientId },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return result.matchedCount === 1;
}

export async function markAllRead(clientId: ObjectId): Promise<void> {
  await (await collection()).updateMany({ clientId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
}
