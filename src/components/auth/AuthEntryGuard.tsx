"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// /login, /signup, and /verify-email must never be shown to someone who's
// already signed in — src/proxy.ts already redirects away from all three
// on a fresh request, but "fresh request" is exactly what back/forward
// navigation to one of them often isn't:
//
// - The browser's own back/forward cache (bfcache) can restore a full
//   page snapshot with no request to the server at all.
// - Next's client-side Router Cache keeps back/forward navigation instant
//   by reusing a previously-rendered page — and per Next's own docs this
//   is true unconditionally, independent of any dynamic/static
//   revalidation setting, so nothing in the target page itself can opt
//   out of it.
//
// Rather than chase either caching layer directly, this asks the one
// question that actually matters — "does the server still consider this
// path something to redirect away from?" — every time the app's current
// route becomes one of these three, by making a real request to that
// same URL. `usePathname()` updates on every navigation (including
// history/back-forward) regardless of which cache served the visible
// page, and this component lives in the root layout, which is never
// itself unmounted, so it's never at the mercy of the target page's own
// cache lifecycle.
const GUARDED_PATHS = new Set(["/login", "/signup", "/verify-email"]);

export default function AuthEntryGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GUARDED_PATHS.has(pathname)) return;

    let cancelled = false;

    fetch(pathname, { cache: "no-store", redirect: "follow" })
      .then((response) => {
        if (cancelled) return;
        // proxy.ts's "already signed in" check answers with a redirect —
        // response.redirected/.url reflect where fetch ultimately landed
        // after following it, same-origin so both are readable here.
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
  }, [pathname]);

  return null;
}
