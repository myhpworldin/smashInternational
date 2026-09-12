import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Client onboarding no longer requires an account or login — visiting the
// single public /onboarding URL gets this cookie automatically. The token
// itself (256 bits, unguessable) is the entire credential: whoever holds
// it can read/edit that one draft, the same way a session cookie would,
// just without a password step. There's no server-side session list to
// revoke against, so treat losing this cookie (clearing site data, a
// different browser/device) as losing access to that draft — there is
// intentionally no recovery path, matching the "single shareable URL, no
// login" design.
//
// The cookie is issued in src/proxy.ts, not here — Next.js only allows
// setting cookies from a Route Handler or Server Action, never from a
// Server Component's render, and the onboarding page/data-fetching runs
// as a Server Component. Proxy runs first and guarantees the cookie
// already exists by the time any of this code reads it.
export const ONBOARDING_ACCESS_COOKIE = "onboarding_access";

export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export async function readAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ONBOARDING_ACCESS_COOKIE)?.value;
}
