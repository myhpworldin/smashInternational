import type { ClientActionResult } from "@/lib/client-actions/approvals";
import type { SupportTicketPriority } from "@/shared/types/supportTicket";

// Stage 1 Phase 15 — same honest abstraction pattern as the rest of
// lib/client-actions/. Stage 1 Phase 23 wires this to the real endpoint
// Phase 22 built (POST /api/client/support-tickets), and switches the
// input from a `serviceLabel` string to a real `serviceId` — the label
// alone can't be validated/matched server-side against the client's
// actual engagements, so SupportTicketForm.tsx (and the page that feeds
// it its service options) were updated in the same pass to pass ids.
export async function createSupportTicket(input: {
  subject: string;
  serviceId?: string;
  description: string;
  priority?: SupportTicketPriority;
}): Promise<ClientActionResult> {
  try {
    const response = await fetch("/api/client/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't submit this ticket."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}
