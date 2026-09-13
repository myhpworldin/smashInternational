// A UX-only marker that a client "signed up"/"logged in" through the mock
// flows built in Stage 1 Phases 2–4. This has zero security value — there
// is no real client account or server-issued session behind it (see the
// Phase 1 audit: only admin has a real signed-cookie session today). It
// exists purely so route guards can make a UX decision ("send them to
// login" vs "let them through to the page, which does its own real check")
// and so that decision survives a refresh, per this phase's requirement.
// The real backend implementation must replace this outright, not build on
// top of it — localStorage is never itself an authentication mechanism.
const STORAGE_KEY = "smash_mock_client_session";

export type MockClientSession = { role: "client" };

export function readMockClientSession(): MockClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role === "client" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMockClientSession(session: MockClientSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private browsing, quota) — the guard
    // degrades to "unauthenticated" in that case, which is the safe
    // direction to fail in for a UX-only check.
  }
}

export function clearMockClientSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See writeMockClientSession.
  }
}
