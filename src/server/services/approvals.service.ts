import "server-only";
import type { ObjectId } from "mongodb";
import type { ApprovalItem } from "@/shared/types/approval";

// Stage 1 Phase 12 — no approval backend exists yet. Same honest-empty
// seam as every other Phase 9-11 adapter.
export async function listApprovalsForClient(_clientId: ObjectId): Promise<ApprovalItem[]> {
  return [];
}

export async function getApprovalForClient(_approvalId: string, _clientId: ObjectId): Promise<ApprovalItem | null> {
  return null;
}
