"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { site } from "@/shared/config/site";
import ClientSidebar from "@/components/client/ClientSidebar";
import MobileNavDrawer from "@/components/client/MobileNavDrawer";

// Stage 1 Phase 5 — the full client portal shell: a persistent left
// sidebar on desktop, collapsing to a header hamburger + drawer below the
// md breakpoint (§4/§5). Access itself is still enforced entirely
// server-side by requireRole("client") in dashboard/layout.tsx before
// this ever renders — nothing here is a security boundary, same as
// Phase 2's version of this component.
export default function ClientPortalShell({
  children,
  identityLabel,
  notificationCount = 0,
}: {
  children: ReactNode;
  identityLabel: string;
  notificationCount?: number;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-carbon px-6 py-8 md:block">
        <Link href="/dashboard" className="mb-8 block font-body text-xs tracking-[0.14em] text-bone">
          {site.shortName} <span className="text-ash">Client Portal</span>
        </Link>
        <ClientSidebar notificationCount={notificationCount} />
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-carbon px-6 py-4 font-body text-xs tracking-[0.14em] text-bone md:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="text-bone hover:text-ash focus-visible:-outline-offset-2 md:hidden"
            >
              Menu
            </button>
            <Link href="/dashboard" className="transition-colors duration-150 hover:text-ash md:hidden">
              {site.shortName}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-ash normal-case">{identityLabel}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-bone underline decoration-carbon underline-offset-4 transition-colors duration-150 hover:decoration-bone focus-visible:-outline-offset-2 disabled:opacity-60"
            >
              {loggingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-10 md:px-10">{children}</main>
      </div>

      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} notificationCount={notificationCount} />
    </div>
  );
}
