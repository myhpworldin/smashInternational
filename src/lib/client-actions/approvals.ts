// Stage 1 Phase 12 §26/§52 — the clean action abstraction ApprovalActions
// calls, so a later backend phase only replaces these two function
// bodies (with a real fetch to a real endpoint) and no component changes.
// Returns a real (rejected) result today rather than faking success —
// "do not pretend the backend has persisted" applies just as much to a
// stub as to a real broken request.
export type ClientActionResult = { ok: true } | { ok: false; errors: string[] };

const NOT_CONNECTED = ["Approvals aren't connected to a backend yet."];

export async function approveDeliverable(_approvalId: string): Promise<ClientActionResult> {
  return { ok: false, errors: NOT_CONNECTED };
}

export async function requestApprovalChanges(_approvalId: string, _message: string): Promise<ClientActionResult> {
  return { ok: false, errors: NOT_CONNECTED };
}
