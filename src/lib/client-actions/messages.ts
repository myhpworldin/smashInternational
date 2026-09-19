import type { ClientActionResult } from "@/lib/client-actions/approvals";

// Stage 1 Phase 15 — same honest abstraction pattern as approvals.ts/
// budget.ts. Stage 1 Phase 23 wires this to the real endpoint Phase 22
// built (POST /api/client/conversations/[id]/messages) — no change to
// MessageComposer.tsx needed.
export async function sendMessage(conversationId: string, text: string): Promise<ClientActionResult> {
  try {
    const response = await fetch(`/api/client/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't send this message."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}
