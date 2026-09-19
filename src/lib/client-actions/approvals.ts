// Stage 1 Phase 12 §26/§52 — the clean action abstraction ApprovalActions
// calls. Stage 1 Phase 23 wires these to the real endpoints Phase 22
// built (POST /api/client/approvals/[id]/{approve,request-changes}) —
// no change to ApprovalActions.tsx itself was needed, since this
// abstraction's signature and result shape were designed for exactly
// this swap back in Phase 12.
export type ClientActionResult = { ok: true } | { ok: false; errors: string[] };

const UNREACHABLE = ["Couldn't reach the server. Check your connection and try again."];

export async function approveDeliverable(approvalId: string): Promise<ClientActionResult> {
  try {
    const response = await fetch(`/api/client/approvals/${approvalId}/approve`, { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't approve this item."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: UNREACHABLE };
  }
}

export async function requestApprovalChanges(approvalId: string, message: string): Promise<ClientActionResult> {
  try {
    const response = await fetch(`/api/client/approvals/${approvalId}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: message }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't submit your change request."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: UNREACHABLE };
  }
}
