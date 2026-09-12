"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { site } from "@/shared/config/site";

export default function DashboardRail({ label }: { label: string }) {
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
      <span>
        {site.shortName} <span className="text-ash">{label}</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-ash hover:text-bone focus-visible:-outline-offset-2"
      >
        {loggingOut ? "Signing out" : "Sign out"}
      </button>
    </header>
  );
}
