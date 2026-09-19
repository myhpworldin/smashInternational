import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { MessageSender } from "@/shared/types/message";

const COLLECTION = "conversationMessages";

// Stage 1 Phase 22 §27/§32 — one message row per conversation (support
// ticket or plain), rather than an embedded array on the conversation
// document, so a long-running thread never needs the whole document
// rewritten to append one message. `senderRole` distinguishes an
// internal staff/admin sender from the client without exposing which
// specific staff member to the client (§26's "do not expose internal-only
// staff conversations/identities" — the client-facing mapper always
// renders staff senders as "SMASH Team," see messages.service.ts).
// Recommended indexes: { conversationId: 1, createdAt: 1 }.
export type ConversationMessageDoc = {
  _id: ObjectId;
  conversationId: ObjectId;
  clientId: ObjectId;
  senderRole: MessageSender;
  senderUserId: ObjectId | null;
  senderName: string;
  text: string;
  attachments: { name: string; url: string }[];
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<ConversationMessageDoc>(COLLECTION);
}

export async function create(input: {
  conversationId: ObjectId;
  clientId: ObjectId;
  senderRole: MessageSender;
  senderUserId: ObjectId | null;
  senderName: string;
  text: string;
  attachments?: { name: string; url: string }[];
}): Promise<ConversationMessageDoc> {
  const doc: ConversationMessageDoc = {
    _id: new ObjectId(),
    conversationId: input.conversationId,
    clientId: input.clientId,
    senderRole: input.senderRole,
    senderUserId: input.senderUserId,
    senderName: input.senderName,
    text: input.text,
    attachments: input.attachments ?? [],
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

export async function listByConversationId(conversationId: ObjectId): Promise<ConversationMessageDoc[]> {
  return (await collection()).find({ conversationId }).sort({ createdAt: 1 }).toArray();
}
