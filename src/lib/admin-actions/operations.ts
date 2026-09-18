// Stage 1 Phase 13 — the admin-side counterpart to Phase 12's
// lib/client-actions/*: a clean abstraction every new management form
// calls, so a later backend phase only replaces these function bodies
// (with real API calls) and no admin UI component changes. Honest about
// not being connected to a backend yet (a real rejected result, not a
// faked success) while the forms around them still exercise full
// validation/loading/error UX.
export type AdminActionResult = { ok: true } | { ok: false; errors: string[] };

const NOT_CONNECTED = ["This isn't connected to a backend yet — nothing was saved."];

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

export async function savePerformanceEntry(_input: unknown): Promise<AdminActionResult> {
  return { ok: false, errors: NOT_CONNECTED };
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
