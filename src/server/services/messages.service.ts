import "server-only";
import type { ObjectId } from "mongodb";
import type { Conversation } from "@/shared/types/message";

// Stage 1 Phase 15 — no communication backend exists yet. Same
// honest-empty seam as every Phase 9-14 adapter.
export async function listConversationsForClient(_clientId: ObjectId): Promise<Conversation[]> {
  return [];
}

export async function getConversationForClient(_conversationId: string, _clientId: ObjectId): Promise<Conversation | null> {
  return null;
}
