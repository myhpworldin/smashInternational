import "server-only";
import { ObjectId } from "mongodb";
import * as conversationsRepo from "@/server/repositories/conversations.repo";
import type { ConversationDoc, ConversationRelatedType } from "@/server/repositories/conversations.repo";
import * as conversationMessagesRepo from "@/server/repositories/conversationMessages.repo";
import type { ConversationMessageDoc } from "@/server/repositories/conversationMessages.repo";
import * as projectsRepo from "@/server/repositories/projects.repo";
import * as campaignsRepo from "@/server/repositories/campaigns.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import type { Conversation, ChatMessage } from "@/shared/types/message";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 22 §26-§28 — real persistence, replacing the Phase 15
// stub. Keeps the exact Conversation/ChatMessage shapes the Phase 15
// frontend already consumes.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// §26's "do not expose internal-only staff conversations" — a client
// never sees which specific staff member sent a message, only that it
// came from the SMASH team, so a message's real sender name for a staff
// row is never surfaced past this constant.
const STAFF_DISPLAY_NAME = "SMASH Team";

function toChatMessage(doc: ConversationMessageDoc): ChatMessage {
  return {
    id: doc._id.toHexString(),
    sender: doc.senderRole,
    senderName: doc.senderRole === "client" ? doc.senderName : STAFF_DISPLAY_NAME,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
    attachments: doc.attachments.length > 0 ? doc.attachments : undefined,
  };
}

async function relatedLabelFor(doc: ConversationDoc): Promise<string | undefined> {
  if (doc.relatedEntityType === "project" && doc.relatedEntityId) {
    return (await projectsRepo.findById(doc.relatedEntityId))?.name;
  }
  if (doc.relatedEntityType === "campaign" && doc.relatedEntityId) {
    return (await campaignsRepo.findById(doc.relatedEntityId))?.name;
  }
  if (doc.relatedEntityType === "support_ticket") return "Support Ticket";
  return undefined;
}

async function toConversation(doc: ConversationDoc): Promise<Conversation> {
  const messages = await conversationMessagesRepo.listByConversationId(doc._id);
  return {
    id: doc._id.toHexString(),
    subject: doc.subject,
    serviceLabel: doc.serviceId ? getServiceById(doc.serviceId)?.label : undefined,
    relatedLabel: await relatedLabelFor(doc),
    lastMessageAt: doc.lastMessageAt.toISOString(),
    // No persisted per-client read-state on individual messages yet
    // (§27 lists it as a data-model concept, but no frontend control
    // reads/writes it this phase — same "don't build what nothing
    // consumes yet" restraint as Phase 17's deliverable-creation UI) —
    // honestly 0 rather than a fabricated count.
    unreadCount: 0,
    messages: messages.map(toChatMessage),
  };
}

export async function listConversationsForClient(clientId: ObjectId): Promise<Conversation[]> {
  const docs = await conversationsRepo.listByClientId(clientId);
  return Promise.all(docs.map(toConversation));
}

export async function getConversationForClient(conversationId: string, clientId: ObjectId): Promise<Conversation | null> {
  if (!ObjectId.isValid(conversationId)) return null;
  const doc = await conversationsRepo.findById(new ObjectId(conversationId));
  const owned = assertClientOwnership(doc, clientId);
  return owned ? toConversation(owned) : null;
}

// §26/§28 — a client may only ever send into a conversation it owns;
// ownership is re-checked here, never trusted from the route parameter
// alone reaching this far.
export async function sendMessageForClient(
  conversationId: string,
  clientId: ObjectId,
  text: string,
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<Conversation>> {
  if (!ObjectId.isValid(conversationId)) return { ok: false, errors: ["Conversation not found."] };
  if (text.trim().length === 0) return { ok: false, errors: ["Message cannot be empty."] };

  const doc = await conversationsRepo.findById(new ObjectId(conversationId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return { ok: false, errors: ["Conversation not found."] };

  const now = new Date();
  await conversationMessagesRepo.create({
    conversationId: owned._id,
    clientId,
    senderRole: "client",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: text.trim(),
  });
  await conversationsRepo.touchLastMessageAt(owned._id, now);

  return { ok: true, data: await toConversation(owned) };
}

// Admin-side: creates a new conversation with its opening message in one
// step (§26 — a conversation with zero messages has nothing for the
// client to read, so creation always seeds the first one).
export async function createConversationForAdmin(
  input: {
    clientId: ObjectId;
    subject: string;
    serviceId?: string;
    relatedEntityType?: ConversationRelatedType;
    relatedEntityId?: ObjectId;
    message: string;
  },
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<Conversation>> {
  if (input.subject.trim().length === 0) return { ok: false, errors: ["Subject is required."] };
  if (input.message.trim().length === 0) return { ok: false, errors: ["Message cannot be empty."] };

  const conversation = await conversationsRepo.create({
    clientId: input.clientId,
    subject: input.subject.trim(),
    serviceId: input.serviceId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    createdByUserId: actor._id,
  });

  await conversationMessagesRepo.create({
    conversationId: conversation._id,
    clientId: input.clientId,
    senderRole: "smash_team",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: input.message.trim(),
  });

  return { ok: true, data: await toConversation(conversation) };
}

export async function sendMessageForAdmin(
  conversationId: ObjectId,
  text: string,
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<Conversation>> {
  if (text.trim().length === 0) return { ok: false, errors: ["Message cannot be empty."] };
  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) return { ok: false, errors: ["Conversation not found."] };

  const now = new Date();
  await conversationMessagesRepo.create({
    conversationId: conversation._id,
    clientId: conversation.clientId,
    senderRole: "smash_team",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: text.trim(),
  });
  await conversationsRepo.touchLastMessageAt(conversation._id, now);

  return { ok: true, data: await toConversation(conversation) };
}
