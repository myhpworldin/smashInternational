"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { readMockClientSession } from "@/lib/mock/clientSession";
import { resolveClientDestination, resolveOnboardingProgress } from "@/lib/routing/clientDestination";
import ClientHeader from "@/components/auth/ClientHeader";

// This is a UX convenience, not a security boundary — a determined visitor
// can trivially bypass it (it's a client-side redirect based on a
// localStorage flag with no cryptographic backing). Every page it wraps
// still gets its data from endpoints that enforce their own real
// authorization server-side (see src/proxy.ts and each route handler) —
// this component's only job is to avoid flashing the wrong page's content
// before that real check would have rejected the request anyway.
type ProtectedClientRouteProps = {
  children: ReactNode;
  /** Require onboarding to be "approved" specifically (e.g. a dashboard),
   *  not just "signed in" (e.g. the onboarding wizard itself). */
  requireApprovedOnboarding?: boolean;
};

type GuardState = "checking" | "ready" | "redirecting";

export default function ProtectedClientRoute({
  children,
  requireApprovedOnboarding = false,
}: ProtectedClientRouteProps) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = readMockClientSession();
      if (!session) {
        router.replace("/login");
        if (!cancelled) setState("redirecting");
        return;
      }

      if (!requireApprovedOnboarding) {
        if (!cancelled) setState("ready");
        return;
      }

      // Real data, not a mock — the same endpoint the onboarding wizard
      // itself reads from.
      try {
        const response = await fetch("/api/onboarding");
        const data = await response.json();
        const progress = resolveOnboardingProgress(data.onboarding.status, data.onboarding);

        if (progress !== "approved") {
          router.replace(resolveClientDestination("authenticated", progress));
          if (!cancelled) setState("redirecting");
          return;
        }

        if (!cancelled) setState("ready");
      } catch {
        // Can't confirm approval — fail toward the wizard/status screen
        // rather than showing dashboard content without having checked.
        router.replace("/onboarding");
        if (!cancelled) setState("redirecting");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state !== "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 py-4">
        <p className="font-body text-sm text-ash">Loading…</p>
      </main>
    );
  }

  return (
    <>
      <ClientHeader />
      {children}
    </>
  );
}
