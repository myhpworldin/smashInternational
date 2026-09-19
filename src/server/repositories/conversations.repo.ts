import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";

const COLLECTION = "conversations";

// Stage 1 Phase 22 §26/§27/§29 — the one generic messaging primitive
// this codebase needed, backing both the standalone client Communication
// area (Phase 15's Conversation contract) and support tickets (a ticket
// owns exactly one conversation as its own thread — see
// supportTickets.repo.ts's `conversationId`, rather than a second,
// parallel message store for tickets). `relatedEntityType`/
// `relatedEntityId` are optional: a plain client↔SMASH conversation has
// neither, while a support-ticket-owned or service/project/campaign-
// linked one does. Recommended indexes: { clientId: 1, lastMessageAt: -1 },
// { clientId: 1 }.
export type ConversationRelatedType = "service" | "project" | "campaign" | "support_ticket";

export type ConversationDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  subject: string;
  serviceId: string | null;
  relatedEntityType: ConversationRelatedType | null;
  relatedEntityId: ObjectId | null;
  lastMessageAt: Date;
  createdByUserId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ConversationDoc>(COLLECTION);
}

export async function create(input: {
  clientId: ObjectId;
  subject: string;
  serviceId: string | null;
  relatedEntityType: ConversationRelatedType | null;
  relatedEntityId: ObjectId | null;
  createdByUserId: ObjectId;
}): Promise<ConversationDoc> {
  const now = new Date();
  const doc: ConversationDoc = {
    _id: new ObjectId(),
    clientId: input.clientId,
    subject: input.subject,
    serviceId: input.serviceId,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    lastMessageAt: now,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function findById(id: ObjectId): Promise<ConversationDoc | null> {
  return (await collection()).findOne({ _id: id });
}

export async function listByClientId(clientId: ObjectId): Promise<ConversationDoc[]> {
  return (await collection()).find({ clientId }).sort({ lastMessageAt: -1 }).toArray();
}

export async function touchLastMessageAt(id: ObjectId, at: Date): Promise<void> {
  await (await collection()).updateOne({ _id: id }, { $set: { lastMessageAt: at, updatedAt: at } });
}
