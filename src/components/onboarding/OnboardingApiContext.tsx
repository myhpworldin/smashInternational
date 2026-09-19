"use client";

import { createContext, useContext, type ReactNode } from "react";

// Stage 1 Phase 29 (admin-assisted onboarding) — the one thing that
// differs between a client filling out their own onboarding and an admin
// filling it in on a client's behalf is which API base path every fetch
// call underneath OnboardingWizard should hit: "/api/onboarding" (session-
// derived identity) or "/api/admin/users/<id>/onboarding" (explicit target
// client). Everything else — the wizard, every step, validation, the
// asset panel, the summary — is the exact same client-facing code either
// way; this context is the one seam that lets it run in both modes
// without a second implementation of any of it. Defaults to the original
// client path so no existing caller needs to change.
const OnboardingApiContext = createContext<string>("/api/onboarding");

export function OnboardingApiProvider({ basePath, children }: { basePath: string; children: ReactNode }) {
  return <OnboardingApiContext.Provider value={basePath}>{children}</OnboardingApiContext.Provider>;
}

export function useOnboardingApiBase(): string {
  return useContext(OnboardingApiContext);
}
