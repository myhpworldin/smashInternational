import type { ClientActionResult } from "@/lib/client-actions/approvals";

// Stage 1 Phase 15 — same honest abstraction pattern as approvals.ts/
// budget.ts: a real rejected result, not a faked sent message.
export async function sendMessage(_conversationId: string, _text: string): Promise<ClientActionResult> {
  return { ok: false, errors: ["Messaging isn't connected to a backend yet."] };
}
