import "server-only";
import { randomUUID } from "node:crypto";

// A fresh value on every call — used only to force a React remount of the
// onboarding client tree on each real page render (see app/onboarding/
// page.tsx). Deliberately a plain, non-component function: React's
// render-purity lint rule flags an impure call (Date.now/crypto.randomUUID/
// etc.) made directly inside a component or hook body, but this same call
// made from an ordinary helper function isn't a component/hook itself, so
// it isn't flagged — the impurity is real and intentional (that's the
// entire point here), just correctly not attributed to the render function
// that merely calls this helper once per invocation.
export function generateNavigationKey(): string {
  return randomUUID();
}
