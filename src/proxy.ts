import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/server/auth/session";
import { generateAccessToken, ONBOARDING_ACCESS_COOKIE } from "@/server/onboarding/access";

// Optimistic checks only — reads the signed cookie, never the database.
// The real authorization check happens server-side in the DAL (src/server/auth/dal.ts)
// for every protected page, since Proxy runs on prefetches too and isn't a
// substitute for per-request verification.
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  // Not necessarily a client's *ideal* landing spot (an approved client
  // belongs on /dashboard) — but proxy.ts is edge-only and never reads
  // the database (see the file-level comment), so it can't compute that
  // here. /onboarding is the safe default: it already branches internally
  // between the wizard and a status screen for every progress state, the
  // same fallback resolveClientDestination() uses client-side. Previously
  // missing entirely, which sent an authenticated client to "/" instead.
  client: "/onboarding",
  // Missing here had the exact same failure mode client's absence used to:
  // any authenticated staff session hitting /login, /admin, /signup, or
  // /verify-email fell through the `?? "/"` fallback below and got bounced
  // to the marketing homepage instead of their own area.
  staff: "/staff",
};

const ONBOARDING_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get("session")?.value);

  const isAdminRoute = pathname.startsWith("/admin");
  const isStaffRoute = pathname.startsWith("/staff");
  // /signup and /verify-email belong here too: an already-authenticated
  // visitor landing on any of these (fresh navigation, typed URL, or the
  // browser's back button after finishing signup/login) must never be
  // served that page while still signed in — see the pageshow/bfcache
  // handling in AuthEntryGuard.tsx for the complementary fix covering the
  // browser-cache-only case this per-request check can't see.
  const isAuthEntryRoute = pathname === "/login" || pathname === "/signup" || pathname === "/verify-email";
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/api/onboarding");

  if ((isAdminRoute || isStaffRoute) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && session && session.role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", request.url));
  }

  if (isStaffRoute && session && session.role !== "staff") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", request.url));
  }

  if (isAuthEntryRoute && session) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", request.url));
  }

  // An admin's real session must never be treated as "a client visiting
  // their own onboarding" — checked here (the one place that can actually
  // see the real, httpOnly admin session) rather than in the onboarding
  // page/component, which only ever sees the separate mock client-auth
  // signal and has no way to know about a real admin session at all.
  // Scoped to the page itself, not /api/onboarding/*: admin legitimately
  // calls some of those (e.g. the asset file route) when reviewing a
  // client's submission from /admin/onboarding/[id].
  if (pathname === "/onboarding" && session?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // The onboarding flow has no login — a visitor's draft is identified by
  // this cookie alone. Next.js only allows setting cookies from a Route
  // Handler or Server Action, never from a Server Component's render, so
  // it's issued here (Proxy can set response cookies).
  //
  // A Set-Cookie header alone isn't enough on this exact request: it only
  // reaches the browser, which won't send it back until the *next*
  // request. The page/route handler that runs right after this one reads
  // cookies off the original incoming request, so without forwarding the
  // token there too, it would generate and persist a *second*, different
  // token for the same visitor — orphaning that first draft immediately.
  // Rewriting the request's own Cookie header (via NextResponse.next's
  // `request` option) makes the same token visible to both.
  if (isOnboardingRoute && !request.cookies.get(ONBOARDING_ACCESS_COOKIE)) {
    const token = generateAccessToken();

    const requestHeaders = new Headers(request.headers);
    const existingCookieHeader = requestHeaders.get("cookie");
    const newCookiePair = `${ONBOARDING_ACCESS_COOKIE}=${token}`;
    requestHeaders.set(
      "cookie",
      existingCookieHeader ? `${existingCookieHeader}; ${newCookiePair}` : newCookiePair,
    );

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(ONBOARDING_ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONBOARDING_ACCESS_MAX_AGE_SECONDS,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/login",
    "/signup",
    "/verify-email",
    "/onboarding",
    "/api/onboarding/:path*",
  ],
};
