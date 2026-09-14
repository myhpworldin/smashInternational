"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Two related problems, one root cause: back/forward navigation can show
// a page that was rendered under a *different* session than the one
// active right now. The browser's own back/forward cache (bfcache) can
// restore a full page snapshot with no request to the server at all, and
// separately, Next's client-side Router Cache keeps back/forward
// navigation instant by reusing a previously-rendered page — per Next's
// own docs this is true unconditionally, independent of any
// dynamic/static revalidation setting, so nothing the target page itself
// does can opt out of it. Neither caching layer knows that the session
// cookie underneath it changed.
//
// This component lives in the root layout, which is never itself
// unmounted, so it's never at the mercy of the target page's own cache
// lifecycle — and usePathname() updates reactively on every navigation,
// including back/forward, no matter which cache served the page.
//
// Case 1 — auth-entry pages (/login, /signup, /verify-email): someone
// already signed in must never be shown these. proxy.ts already redirects
// away on a fresh request, so the check here is simply "does the server
// still want to redirect this path away" — a real request to the same
// URL, following any redirect it returns.
const AUTH_ENTRY_PATHS = new Set(["/login", "/signup", "/verify-email"]);

// Case 2 — protected areas (/admin, /dashboard, /onboarding,
// /force-password-change): logging out of one account and into another
// in the same browser, then pressing Back, can restore a cached page
// that was rendered for the *previous* account — showing one admin's
// actual data to whoever's logged in now. There's no redirect to detect
// here (the current session may be perfectly authorized for this URL);
// the content itself just needs to be re-rendered against whichever
// session is active right now. router.refresh() asks Next to refetch the
// current route's server-rendered payload — a real request, through the
// same middleware and requireRole/blockIfPasswordChangeRequired checks
// every other load goes through — without a full page reload.
const PROTECTED_PREFIXES = ["/admin", "/dashboard", "/onboarding", "/force-password-change"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthEntryGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (AUTH_ENTRY_PATHS.has(pathname)) {
      let cancelled = false;

      fetch(pathname, { cache: "no-store", redirect: "follow" })
        .then((response) => {
          if (cancelled) return;
          // proxy.ts's "already signed in" check answers with a
          // redirect — response.redirected/.url reflect where fetch
          // ultimately landed after following it, same-origin so both
          // are readable here.
          if (response.redirected && response.url !== window.location.href) {
            window.location.replace(response.url);
          }
        })
        .catch(() => {
          // Can't confirm either way — leave the page as rendered rather
          // than guessing.
        });

      return () => {
        cancelled = true;
      };
    }

    if (isProtectedPath(pathname)) {
      router.refresh();
    }
  }, [pathname, router]);

  return null;
}
