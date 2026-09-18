"use client";

import { useEffect, useRef } from "react";
import { writeSectionCache } from "@/lib/onboarding/draftCache";

const DEBOUNCE_MS = 500;

// Mirrors a step's current local form value into the browser-side draft
// cache, debounced, so a refresh/back/tab-close mid-edit doesn't lose it —
// see draftCache.ts. Deliberately skips the very first run (mount): that
// run's `value` is whatever the step was just initialized with (from the
// server draft or, per useDraftCacheRestore, the cache itself), and writing
// it straight back out would be a pointless no-op at best — the real
// purpose here is to persist *changes*, not to immediately re-echo a value
// this same effect had no part in producing.
export function useDraftCacheSync<T>(onboardingId: string, section: string, value: T): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  // Mirrors whatever `value` is pending behind the debounce timer, purely
  // for the unload-flush below — a refresh/tab-close that lands inside the
  // debounce window must not lose the keystrokes typed in that last stretch
  // just because the timer hadn't fired yet (localStorage writes are
  // synchronous, so flushing immediately here is reliable in a way an
  // in-flight network request on unload never would be).
  const pendingValue = useRef<T | null>(null);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    pendingValue.current = value;
    timer.current = setTimeout(() => {
      writeSectionCache(onboardingId, section, value);
      pendingValue.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [onboardingId, section, value]);

  useEffect(() => {
    const flush = () => {
      if (pendingValue.current !== null) {
        writeSectionCache(onboardingId, section, pendingValue.current);
        pendingValue.current = null;
      }
    };
    // "pagehide" covers refresh/close/navigate-away across more browsers
    // than "beforeunload" alone (notably mobile Safari, which often skips
    // beforeunload); "visibilitychange" additionally catches a backgrounded
    // tab (e.g. switching apps) that never formally unloads at all.
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [onboardingId, section]);
}
