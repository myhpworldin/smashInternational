"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { site } from "@/shared/config/site";

export default function DashboardRail({ label, homeHref = "/admin" }: { label: string; homeHref?: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-carbon px-6 py-4 font-body text-xs tracking-[0.14em] text-bone md:px-10">
      <Link
        href={homeHref}
        className="transition-colors duration-150 hover:text-ash focus-visible:-outline-offset-2"
      >
        {site.shortName} <span className="text-ash">{label}</span>
      </Link>
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
