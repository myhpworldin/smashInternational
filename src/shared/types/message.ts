// Stage 1 Phase 15 §16-19 — the client communication contract. No backend
// exists yet (see server/services/messages.service.ts).
export type MessageSender = "client" | "smash_team";

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: { name: string; url: string }[];
};

export type Conversation = {
  id: string;
  subject: string;
  serviceLabel?: string;
  relatedLabel?: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChatMessage[];
};
