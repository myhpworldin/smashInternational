import "server-only";
import type { ObjectId } from "mongodb";
import type { SupportTicket } from "@/shared/types/supportTicket";

// Stage 1 Phase 15 — no support backend exists yet. Same honest-empty
// seam as every Phase 9-14 adapter.
export async function listSupportTicketsForClient(_clientId: ObjectId): Promise<SupportTicket[]> {
  return [];
}

export async function getSupportTicketForClient(_ticketId: string, _clientId: ObjectId): Promise<SupportTicket | null> {
  return null;
}
