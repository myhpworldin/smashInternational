import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, readSessionCookie } from "@/server/auth/session";
import { findById } from "@/server/repositories/users.repo";
import type { Role, SessionPayload } from "@/shared/types/user";

// Memoized per request/render pass — cheap to call from multiple
// components without re-verifying the cookie each time.
export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  const cookie = await readSessionCookie();
  return decrypt(cookie);
});

// Redirects unauthenticated requests to /login. Call from a page or a
// function it awaits — never from the root layout (it doesn't re-run on
// client-side navigation, so it can't be the only guard for nested routes).
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session || session.role !== role) {
    redirect("/login");
  }
  return session;
}

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  return findById(session.userId);
});
