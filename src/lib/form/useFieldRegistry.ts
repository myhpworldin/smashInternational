"use client";

import { useCallback, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion/prefersReducedMotion";

const FOCUSABLE_SELECTOR = "input, textarea, select, button, [tabindex]";

// Lets a step register each field's DOM node under a stable key (its error
// key, so the same string already used to route validation errors also
// anchors scroll/focus) and later jump to the first one that actually has a
// node mounted — used after a failed Continue/Submit so the user lands on
// the first problem instead of being left wherever they happened to scroll.
export function useFieldRegistry() {
  const nodes = useRef(new Map<string, HTMLElement>());

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  const focusFirst = useCallback((orderedKeys: string[]) => {
    for (const key of orderedKeys) {
      const el = nodes.current.get(key);
      if (!el) continue;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
      const focusable = el.matches(FOCUSABLE_SELECTOR)
        ? el
        : el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      focusable?.focus({ preventScroll: true });
      return;
    }
  }, []);

  return { register, focusFirst };
}
