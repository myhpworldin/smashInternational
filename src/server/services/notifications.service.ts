import "server-only";
import { ObjectId } from "mongodb";
import * as notificationsRepo from "@/server/repositories/notifications.repo";
import type { NotificationRow } from "@/shared/types/notification";

export async function listNotificationsForStaff(staffUserId: string): Promise<NotificationRow[]> {
  if (!ObjectId.isValid(staffUserId)) return [];
  const docs = await notificationsRepo.listForRecipient(new ObjectId(staffUserId));
  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    assignmentId: doc.assignmentId.toHexString(),
    onboardingId: doc.onboardingId.toHexString(),
    serviceId: doc.serviceId,
    read: doc.read,
    createdAt: doc.createdAt.toISOString(),
  }));
}

export type MarkNotificationReadResult = { ok: true } | { ok: false; errors: string[] };

export async function markNotificationRead(
  notificationId: string,
  staffUserId: string,
): Promise<MarkNotificationReadResult> {
  if (!ObjectId.isValid(notificationId) || !ObjectId.isValid(staffUserId)) {
    return { ok: false, errors: ["Notification not found."] };
  }
  const marked = await notificationsRepo.markRead(new ObjectId(notificationId), new ObjectId(staffUserId));
  if (!marked) return { ok: false, errors: ["Notification not found."] };
  return { ok: true };
}
