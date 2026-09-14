"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { site } from "@/shared/config/site";
import { clearMockClientSession } from "@/lib/mock/clientSession";

// The client-facing equivalent of DashboardRail (admin's header) — there
// was no sign-out affordance anywhere on /onboarding or /dashboard before
// this, since neither page had any header/chrome at all. Rendered by
// ProtectedClientRoute once it's confirmed the visitor is signed in, so
// every page that guard wraps gets this for free.
export default function ClientHeader() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    clearMockClientSession();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-carbon px-6 py-4 font-body text-xs tracking-[0.14em] text-bone md:px-10">
      <span>{site.shortName}</span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-bone underline decoration-carbon underline-offset-4 transition-colors duration-150 hover:decoration-bone focus-visible:-outline-offset-2 disabled:opacity-60"
      >
        {loggingOut ? "Signing out" : "Sign out"}
      </button>
    </header>
  );
}
