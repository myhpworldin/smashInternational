import type { ChatMessage } from "@/shared/types/message";

// Stage 1 Phase 15 §20-23 — the client support contract. No backend
// exists yet (see server/services/supportTickets.service.ts).
export type SupportTicketStatus = "open" | "assigned" | "in_progress" | "waiting_for_client" | "resolved" | "closed";

export const SUPPORT_TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_for_client: "Waiting for Client",
  resolved: "Resolved",
  closed: "Closed",
};

export type SupportTicketPriority = "low" | "medium" | "high";

export type SupportTicket = {
  id: string;
  subject: string;
  serviceLabel?: string;
  relatedLabel?: string;
  priority?: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  // Reuses ChatMessage (shared/types/message.ts) for the ticket's own
  // conversation rather than a near-identical second message shape.
  messages: ChatMessage[];
};
