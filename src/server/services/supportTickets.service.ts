import "server-only";
import { ObjectId } from "mongodb";
import * as supportTicketsRepo from "@/server/repositories/supportTickets.repo";
import type { SupportTicketDoc } from "@/server/repositories/supportTickets.repo";
import * as conversationsRepo from "@/server/repositories/conversations.repo";
import * as conversationMessagesRepo from "@/server/repositories/conversationMessages.repo";
import * as statusHistoryRepo from "@/server/repositories/statusHistory.repo";
import * as clientNotificationsRepo from "@/server/repositories/clientNotifications.repo";
import { assertClientOwnership } from "@/server/auth/ownership";
import { getServiceById } from "@/shared/config/services";
import type { SupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/shared/types/supportTicket";
import type { ChatMessage } from "@/shared/types/message";
import type { UserDoc } from "@/server/repositories/users.repo";

// Stage 1 Phase 22 §29-§32 — real persistence, replacing the Phase 15
// stub. A ticket owns exactly one conversation as its own thread (§50 —
// reuses conversations.repo.ts/conversationMessages.repo.ts rather than a
// second, parallel message store for tickets), created together with the
// ticket in one operation so a ticket is never left without its own
// thread to reply into.

type ServiceResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const STAFF_DISPLAY_NAME = "SMASH Team";

const VALID_TICKET_TRANSITIONS: Record<SupportTicketStatus, readonly SupportTicketStatus[]> = {
  open: ["assigned", "in_progress", "resolved", "closed"],
  assigned: ["in_progress", "waiting_for_client", "resolved", "closed"],
  in_progress: ["waiting_for_client", "resolved", "closed"],
  waiting_for_client: ["in_progress", "resolved", "closed"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

function isValidTicketTransition(from: SupportTicketStatus, to: SupportTicketStatus): boolean {
  return VALID_TICKET_TRANSITIONS[from].includes(to);
}

function toChatMessage(doc: Awaited<ReturnType<typeof conversationMessagesRepo.listByConversationId>>[number]): ChatMessage {
  return {
    id: doc._id.toHexString(),
    sender: doc.senderRole,
    senderName: doc.senderRole === "client" ? doc.senderName : STAFF_DISPLAY_NAME,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
    attachments: doc.attachments.length > 0 ? doc.attachments : undefined,
  };
}

async function toSupportTicket(doc: SupportTicketDoc): Promise<SupportTicket> {
  const messages = await conversationMessagesRepo.listByConversationId(doc.conversationId);
  return {
    id: doc._id.toHexString(),
    subject: doc.subject,
    serviceLabel: doc.serviceId ? getServiceById(doc.serviceId)?.label : undefined,
    priority: doc.priority ?? undefined,
    status: doc.status,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    messages: messages.map(toChatMessage),
  };
}

export async function listSupportTicketsForClient(clientId: ObjectId): Promise<SupportTicket[]> {
  const docs = await supportTicketsRepo.listByClientId(clientId);
  return Promise.all(docs.map(toSupportTicket));
}

export async function getSupportTicketForClient(ticketId: string, clientId: ObjectId): Promise<SupportTicket | null> {
  if (!ObjectId.isValid(ticketId)) return null;
  const doc = await supportTicketsRepo.findById(new ObjectId(ticketId));
  const owned = assertClientOwnership(doc, clientId);
  return owned ? toSupportTicket(owned) : null;
}

// §29 — a client creates a ticket, its own conversation thread, and the
// opening message (the ticket's own description) in one operation.
export async function createSupportTicketForClient(
  input: { subject: string; serviceId?: string; description: string; priority?: SupportTicketPriority },
  clientId: ObjectId,
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<SupportTicket>> {
  if (input.subject.trim().length === 0) return { ok: false, errors: ["Subject is required."] };
  if (input.description.trim().length === 0) return { ok: false, errors: ["Description is required."] };

  const conversation = await conversationsRepo.create({
    clientId,
    subject: input.subject.trim(),
    serviceId: input.serviceId ?? null,
    relatedEntityType: "support_ticket",
    relatedEntityId: null,
    createdByUserId: actor._id,
  });

  const ticket = await supportTicketsRepo.create({
    clientId,
    conversationId: conversation._id,
    serviceId: input.serviceId ?? null,
    subject: input.subject.trim(),
    description: input.description.trim(),
    priority: input.priority ?? null,
    createdByUserId: actor._id,
  });

  await conversationMessagesRepo.create({
    conversationId: conversation._id,
    clientId,
    senderRole: "client",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: input.description.trim(),
  });

  await statusHistoryRepo.record({
    entityType: "support_ticket",
    entityId: ticket._id,
    clientId,
    previousStatus: null,
    newStatus: "open",
    changedByUserId: actor._id,
    changedByRole: "client",
  });

  return { ok: true, data: await toSupportTicket(ticket) };
}

export async function addSupportMessageForClient(
  ticketId: string,
  clientId: ObjectId,
  text: string,
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<SupportTicket>> {
  if (!ObjectId.isValid(ticketId)) return { ok: false, errors: ["Ticket not found."] };
  if (text.trim().length === 0) return { ok: false, errors: ["Message cannot be empty."] };

  const doc = await supportTicketsRepo.findById(new ObjectId(ticketId));
  const owned = assertClientOwnership(doc, clientId);
  if (!owned) return { ok: false, errors: ["Ticket not found."] };
  if (owned.status === "closed") return { ok: false, errors: ["This ticket is closed."] };

  const now = new Date();
  await conversationMessagesRepo.create({
    conversationId: owned.conversationId,
    clientId,
    senderRole: "client",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: text.trim(),
  });
  await conversationsRepo.touchLastMessageAt(owned.conversationId, now);
  await supportTicketsRepo.touchUpdatedAt(owned._id, now);

  return { ok: true, data: await toSupportTicket(owned) };
}

export async function addSupportMessageForAdmin(
  ticketId: ObjectId,
  text: string,
  actor: Pick<UserDoc, "_id" | "name" | "email">,
): Promise<ServiceResult<SupportTicket>> {
  if (text.trim().length === 0) return { ok: false, errors: ["Message cannot be empty."] };
  const ticket = await supportTicketsRepo.findById(ticketId);
  if (!ticket) return { ok: false, errors: ["Ticket not found."] };

  const now = new Date();
  await conversationMessagesRepo.create({
    conversationId: ticket.conversationId,
    clientId: ticket.clientId,
    senderRole: "smash_team",
    senderUserId: actor._id,
    senderName: actor.name?.trim() || actor.email,
    text: text.trim(),
  });
  await conversationsRepo.touchLastMessageAt(ticket.conversationId, now);
  await supportTicketsRepo.touchUpdatedAt(ticket._id, now);

  await clientNotificationsRepo.upsertForEvent({
    clientId: ticket.clientId,
    type: "support_ticket_updated",
    title: `New reply: ${ticket.subject}`,
    message: `SMASH replied to your ticket "${ticket.subject}".`,
    entityType: "support_ticket",
    entityId: ticket._id,
    href: `/dashboard/support/${ticket._id.toHexString()}`,
  });

  return { ok: true, data: await toSupportTicket(ticket) };
}

export async function updateSupportTicketStatusForAdmin(
  ticketId: ObjectId,
  nextStatus: SupportTicketStatus,
  actor: Pick<UserDoc, "_id">,
): Promise<ServiceResult<SupportTicket>> {
  const existing = await supportTicketsRepo.findById(ticketId);
  if (!existing) return { ok: false, errors: ["Ticket not found."] };

  if (existing.status === nextStatus) {
    return { ok: true, data: await toSupportTicket(existing) };
  }
  if (!isValidTicketTransition(existing.status, nextStatus)) {
    return { ok: false, errors: [`Cannot move a ticket from "${existing.status}" to "${nextStatus}".`] };
  }

  const extra: Parameters<typeof supportTicketsRepo.updateStatus>[3] = {};
  if (nextStatus === "resolved") extra.resolvedAt = new Date();
  if (nextStatus === "closed") extra.closedAt = new Date();

  const updated = await supportTicketsRepo.updateStatus(existing._id, existing.status, nextStatus, extra);
  if (!updated) return { ok: false, errors: ["This ticket just changed. Refresh and try again."] };

  await statusHistoryRepo.record({
    entityType: "support_ticket",
    entityId: updated._id,
    clientId: updated.clientId,
    previousStatus: existing.status,
    newStatus: nextStatus,
    changedByUserId: actor._id,
    changedByRole: "admin",
  });

  await clientNotificationsRepo.upsertForEvent({
    clientId: updated.clientId,
    type: "support_ticket_updated",
    title: `Ticket updated: ${updated.subject}`,
    message: `Your ticket "${updated.subject}" is now ${nextStatus.replace(/_/g, " ")}.`,
    entityType: "support_ticket",
    entityId: updated._id,
    href: `/dashboard/support/${updated._id.toHexString()}`,
  });

  return { ok: true, data: await toSupportTicket(updated) };
}
