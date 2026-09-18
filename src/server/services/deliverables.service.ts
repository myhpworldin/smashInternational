import "server-only";
import type { ObjectId } from "mongodb";
import type { ClientDeliverable } from "@/shared/types/deliverable";

// Stage 1 Phase 12 — no deliverable backend exists yet. Same honest-empty
// seam as every other Phase 9-11 adapter.
export async function listDeliverablesForClient(_clientId: ObjectId): Promise<ClientDeliverable[]> {
  return [];
}

export async function getDeliverableForClient(
  _deliverableId: string,
  _clientId: ObjectId,
): Promise<ClientDeliverable | null> {
  return null;
}
