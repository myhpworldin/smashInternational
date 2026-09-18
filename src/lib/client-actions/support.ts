import type { ClientActionResult } from "@/lib/client-actions/approvals";
import type { SupportTicketPriority } from "@/shared/types/supportTicket";

// Stage 1 Phase 15 — same honest abstraction pattern as the rest of
// lib/client-actions/. The form still validates fully client-side; only
// the final create is a stub.
export async function createSupportTicket(_input: {
  subject: string;
  serviceLabel?: string;
  description: string;
  priority?: SupportTicketPriority;
}): Promise<ClientActionResult> {
  return { ok: false, errors: ["Support tickets aren't connected to a backend yet."] };
}
