import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, readSessionCookie } from "@/server/auth/session";
import { findById } from "@/server/repositories/users.repo";
import type { UserDoc } from "@/server/repositories/users.repo";
import type { Role, SessionPayload } from "@/shared/types/user";

export const FORCE_PASSWORD_CHANGE_PATH = "/force-password-change";

// The one DB read behind every session check below, memoized per
// request/render pass so verifySession/requireRole/getCurrentUser calling
// it repeatedly costs one query, not several.
//
// A valid JWT signature alone isn't enough: it says nothing about whether
// the account has since been blocked, or whether an admin has since reset
// this user's password (both of which must force re-authentication — see
// blockUser/resetPasswordByAdmin in adminUsers.service.ts). Comparing
// against the DB on every call is the price of that — the JWT itself
// carries no revocation signal, so nothing short of a DB read can catch
// it. Missing status/sessionVersion (any doc predating Stage 2 Phase 4)
// defaults to "active" / 1, matching how the field is written everywhere
// else in this codebase.
const getSessionState = cache(async (): Promise<{ payload: SessionPayload; user: UserDoc } | null> => {
  const cookie = await readSessionCookie();
  const payload = await decrypt(cookie);
  if (!payload) return null;

  const user = await findById(payload.userId);
  if (!user) return null;
  if (user.status === "blocked") return null;
  if ((payload.sessionVersion ?? 1) !== (user.sessionVersion ?? 1)) return null;

  return { payload, user };
});

export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  const state = await getSessionState();
  return state?.payload ?? null;
});

// Redirects unauthenticated requests to /login, and — Stage 2 Phase 5 —
// redirects a session whose account still owes a mandatory password
// change to /force-password-change instead of letting it reach any real
// destination. Call from a page or a function it awaits — never from the
// root layout (it doesn't re-run on client-side navigation, so it can't
// be the only guard for nested routes).
export async function requireRole(role: Role): Promise<SessionPayload> {
  const state = await getSessionState();
  if (!state || state.payload.role !== role) {
    redirect("/login");
  }
  if (state.user.mustChangePassword) {
    redirect(FORCE_PASSWORD_CHANGE_PATH);
  }
  return state.payload;
}

// For the one destination that must stay reachable regardless of
// mustChangePassword: /force-password-change itself, and the
// change-password API it posts to. Any valid, non-blocked session is
// enough here — role and mustChangePassword are the caller's problem, not
// this function's.
export async function requireAuthenticatedSession(): Promise<SessionPayload> {
  const state = await getSessionState();
  if (!state) {
    redirect("/login");
  }
  return state.payload;
}

// Real-session guard for pages that aren't behind requireRole (the client
// side: /dashboard, /onboarding) but still must not be reachable while a
// password change is outstanding (Phase 5 spec, §4). A no-op for an
// anonymous visitor (no real session at all) — onboarding's anonymous,
// token-based flow is untouched by this.
export async function blockIfPasswordChangeRequired(): Promise<void> {
  const state = await getSessionState();
  if (state?.user.mustChangePassword) {
    redirect(FORCE_PASSWORD_CHANGE_PATH);
  }
}

export const getCurrentUser = cache(async (): Promise<UserDoc | null> => {
  const state = await getSessionState();
  return state?.user ?? null;
});

// Used by admin API routes in place of a bare role check — role alone
// isn't sufficient once mustChangePassword exists: an admin who owes a
// password change must be refused every other admin action until they've
// completed it (Phase 5 spec, §5 — this is the backend half; the frontend
// modal is UX only).
export async function getAuthorizedAdmin(): Promise<UserDoc | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || user.mustChangePassword) return null;
  return user;
}

// Same shape as getAuthorizedAdmin, for staff-only API routes (e.g.
// /api/staff/assignments) — a non-redirecting check, since a route
// handler needs a 401/403 response, not a page redirect.
export async function getAuthorizedStaff(): Promise<UserDoc | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "staff" || user.mustChangePassword) return null;
  return user;
}

// Same shape again, for client-only API routes (Stage 1 Phase 3's
// service-engagement read endpoint) — the one place a client-facing route
// gets its clientId from, so ownership is always session-derived, never
// anything the request itself supplied (Phase 3 §19).
export async function getAuthorizedClient(): Promise<UserDoc | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "client" || user.mustChangePassword) return null;
  return user;
}
