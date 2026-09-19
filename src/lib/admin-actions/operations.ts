// Stage 1 Phase 13 — the admin-side counterpart to Phase 12's
// lib/client-actions/*: a clean abstraction every new management form
// calls, so a later backend phase only replaces these function bodies
// (with real API calls) and no admin UI component changes. Honest about
// not being connected to a backend yet (a real rejected result, not a
// faked success) while the forms around them still exercise full
// validation/loading/error UX.
export type AdminActionResult = { ok: true } | { ok: false; errors: string[] };

// Stage 1 Phase 17 — real persistence via POST /api/admin/projects
// (serviceEngagements.service.ts et al. are still stubs; this is the
// first admin-action function in this file to graduate from the
// honest-stub pattern to a real backend call).
export async function saveProject(input: unknown): Promise<AdminActionResult> {
  try {
    const response = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this project."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}

// Stage 1 Phase 18 — real persistence via POST /api/admin/campaigns.
export async function saveCampaign(input: unknown): Promise<AdminActionResult> {
  try {
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this campaign."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}

// Stage 1 Phase 18 — real persistence via POST /api/admin/budget.
export async function saveBudgetSnapshot(input: unknown): Promise<AdminActionResult> {
  try {
    const response = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this budget."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}

// Per-service allocation editor's write path, via POST
// /api/admin/budget/allocations — sets the total and every per-service
// allocation together, alongside the existing total-only saveBudgetSnapshot.
export async function saveBudgetAllocations(input: unknown): Promise<AdminActionResult> {
  try {
    const response = await fetch("/api/admin/budget/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this budget."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}

// Stage 1 Phase 13's per-client performance-entry form (AdminPerformanceEntryPanel)
// and Phase 14's cross-client Daily Data Entry workspace both ultimately
// save the same kind of record — Stage 1 Phase 23 wires this one to the
// exact same real endpoint Phase 19 built for the other
// (POST /api/admin/daily-records) rather than standing up a second,
// competing backend for what's structurally identical data. This
// panel has no campaign/project selector, so `campaignOrProjectId` is
// filled in as `null` (the "no specific campaign/project" value the
// endpoint already expects) before sending.
export async function savePerformanceEntry(input: unknown): Promise<AdminActionResult> {
  const payload =
    typeof input === "object" && input !== null ? { campaignOrProjectId: null, ...input } : input;
  try {
    const response = await fetch("/api/admin/daily-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this entry."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}

// Stage 1 Phase 19 — real persistence via POST /api/admin/daily-records.
export async function saveDailyRecord(input: unknown): Promise<AdminActionResult> {
  try {
    const response = await fetch("/api/admin/daily-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [data?.message ?? "Couldn't save this record."] };
    }
    return { ok: true };
  } catch {
    return { ok: false, errors: ["Couldn't reach the server. Check your connection and try again."] };
  }
}
