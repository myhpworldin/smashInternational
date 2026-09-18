"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT_NAV_TOP, CLIENT_NAV_GROUPS } from "@/components/client/clientNav";

// The nav content itself, shared verbatim between the persistent desktop
// sidebar and the mobile drawer (ClientPortalShell) — one place to get
// active-state/grouping right instead of two.
export default function ClientSidebar({
  onNavigate,
  notificationCount = 0,
}: {
  onNavigate?: () => void;
  notificationCount?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <nav className="flex flex-col gap-6 font-body text-sm">
      <Link
        href={CLIENT_NAV_TOP.href}
        onClick={onNavigate}
        aria-current={isActive(CLIENT_NAV_TOP.href) ? "page" : undefined}
        className={`transition-colors duration-150 focus-visible:-outline-offset-2 ${
          isActive(CLIENT_NAV_TOP.href) ? "text-bone" : "text-ash hover:text-bone"
        }`}
      >
        {CLIENT_NAV_TOP.label}
      </Link>

      {CLIENT_NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">{group.label}</p>
          <div className="flex flex-col gap-2 border-l border-carbon pl-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex items-center justify-between gap-2 transition-colors duration-150 focus-visible:-outline-offset-2 ${
                  isActive(item.href) ? "text-bone" : "text-ash hover:text-bone"
                }`}
              >
                {item.label}
                {item.href === "/dashboard/notifications" && notificationCount > 0 && (
                  <span
                    aria-label={`${notificationCount} notifications`}
                    className="rounded-full bg-smash-text px-1.5 py-0.5 font-body text-[10px] text-void"
                  >
                    {notificationCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
