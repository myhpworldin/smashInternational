import type { ClientActionResult } from "@/lib/client-actions/approvals";

// Stage 1 Phase 18 — real persistence via POST /api/client/budget-requests.
// `currentAllocation` is accepted here for backward compatibility with the
// existing BudgetRequestForm call site but is never sent onward — the
// server resolves the real current value itself (budget.service.ts's
// submitBudgetChangeRequestForClient) rather than trusting whatever the
// client-side form last rendered, so a stale or tampered baseline can
// never be recorded as if it were authoritative.
export async function submitBudgetChangeRequest(input: {
  channelName?: string;
  campaignName?: string;
  currentAllocation: number;
  requestedAllocation: number;
  reason: string;
}): Promise<ClientActionResult> {
  try {
    const response = await fetch("/api/client/budget-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: input.channelName,
        campaignName: input.campaignName,
        requestedAllocation: input.requestedAllocation,
        reason: input.reason,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't submit this request."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}
