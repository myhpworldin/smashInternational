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
};

const ONBOARDING_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get("session")?.value);

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/api/onboarding");

  if (isAdminRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && session && session.role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", request.url));
  }

  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/", request.url));
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
  matcher: ["/admin/:path*", "/login", "/onboarding", "/api/onboarding/:path*"],
};
