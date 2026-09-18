import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { NotificationType } from "@/shared/types/notification";

const COLLECTION = "notifications";

// Deliberately narrow — a reference to the assignment/onboarding/service
// it's about, not a copy of any of that record's own data (Phase 4 §10:
// "do not duplicate the entire onboarding record inside the
// notification"). Recommended index (created manually, matching this
// codebase's existing convention): { recipientUserId: 1, createdAt: -1 }.
export type NotificationDoc = {
  _id: ObjectId;
  recipientUserId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  assignmentId: ObjectId;
  onboardingId: ObjectId;
  serviceId: string;
  read: boolean;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<NotificationDoc>(COLLECTION);
}

// Written inside the same transaction as the assignment/handover writes
// (see transferAssignment in serviceAssignments.service.ts) — never a
// separate, later write. That's what makes duplication from a
// double-click or a retried request structurally impossible (Phase 4
// §12): the transfer itself only ever succeeds once per handover (the
// conditional update in serviceAssignments.repo.ts's transferOwnership
// guarantees that), and this call only ever runs on that one successful
// path, in the same all-or-nothing commit.
export async function create(
  entry: {
    recipientUserId: ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    assignmentId: ObjectId;
    onboardingId: ObjectId;
    serviceId: string;
  },
  session: ClientSession,
): Promise<void> {
  await (await collection()).insertOne(
    {
      _id: new ObjectId(),
      recipientUserId: entry.recipientUserId,
      type: entry.type,
      title: entry.title,
      message: entry.message,
      assignmentId: entry.assignmentId,
      onboardingId: entry.onboardingId,
      serviceId: entry.serviceId,
      read: false,
      createdAt: new Date(),
    },
    { session },
  );
}

export async function listForRecipient(recipientUserId: ObjectId, limit = 50): Promise<NotificationDoc[]> {
  return (await collection()).find({ recipientUserId }).sort({ createdAt: -1 }).limit(limit).toArray();
}

// Scoped to the recipient in the filter itself, not just checked after the
// fact — a staff member can never mark someone else's notification read
// by guessing an id.
export async function markRead(id: ObjectId, recipientUserId: ObjectId): Promise<boolean> {
  const result = await (await collection()).updateOne({ _id: id, recipientUserId }, { $set: { read: true } });
  return result.matchedCount === 1;
}
