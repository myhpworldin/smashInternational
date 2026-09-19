import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { SupportTicketStatus, SupportTicketPriority } from "@/shared/types/supportTicket";

const COLLECTION = "supportTickets";

// Stage 1 Phase 22 §29/§30 — ticket metadata only; the actual back-and-
// forth lives in conversationMessages.repo.ts under the ticket's own
// `conversationId` (§50's "reuse existing messaging architecture" — a
// ticket's conversation and a plain Communication conversation are the
// same underlying primitive, just referenced from a different owner).
// Recommended indexes: { clientId: 1, updatedAt: -1 }, { clientId: 1,
// status: 1 }.
export type SupportTicketDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  conversationId: ObjectId;
  serviceId: string | null;
  projectId: ObjectId | null;
  campaignId: ObjectId | null;
  subject: string;
  description: string;
  priority: SupportTicketPriority | null;
  status: SupportTicketStatus;
  createdByUserId: ObjectId | null;
  assignedToUserId: ObjectId | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<SupportTicketDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  conversationId: ObjectId;
  serviceId: string | null;
  subject: string;
  description: string;
  priority: SupportTicketPriority | null;
  createdByUserId: ObjectId | null;
}): Promise<SupportTicketDoc> {
  const now = new Date();
  const doc: SupportTicketDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    conversationId: input.conversationId,
    serviceId: input.serviceId,
    projectId: null,
    campaignId: null,
    subject: input.subject,
    description: input.description,
    priority: input.priority,
    status: "open",
    createdByUserId: input.createdByUserId,
    assignedToUserId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<SupportTicketDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<SupportTicketDoc[]> {
  return (await collection()).find({ clientId }).sort({ updatedAt: -1 }).toArray();
}

export async function updateStatus(
  id: ObjectId,
  fromStatus: SupportTicketStatus,
  toStatus: SupportTicketStatus,
  extra: Partial<Pick<SupportTicketDoc, "resolvedAt" | "closedAt" | "assignedToUserId">> = {},
): Promise<SupportTicketDoc | null> {
  return (await collection()).findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: { status: toStatus, updatedAt: new Date(), ...extra } },
    { returnDocument: "after" },
  );
}

// Bumps the ticket's own updatedAt whenever a new message lands on its
// conversation, so "recently updated first" (§43) reflects real activity.
export async function touchUpdatedAt(id: ObjectId, at: Date): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { updatedAt: at } });
}
