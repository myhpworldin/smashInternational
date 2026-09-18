"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminUserRow } from "@/shared/types/adminUser";

export type UserAction =
  | "view"
  | "edit"
  | "role"
  | "block"
  | "unblock"
  | "password"
  | "copy"
  | "share"
  | "availability"
  | "handovers";

export default function UserActionsMenu({
  user,
  isSelf,
  onAction,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onAction: (action: UserAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { action: UserAction; label: string; disabled?: boolean }[] = [
    { action: "view", label: "View" },
    { action: "edit", label: "Edit" },
    { action: "role", label: "Change Role" },
    ...(user.role === "staff"
      ? [
          { action: "availability" as const, label: "Manage Availability" },
          { action: "handovers" as const, label: "View Handovers" },
        ]
      : []),
    user.status === "blocked"
      ? { action: "unblock", label: "Unblock" }
      : { action: "block", label: "Block", disabled: isSelf },
    {
      action: "password",
      label: "Change Password",
      disabled: isSelf,
    },
    { action: "copy", label: "Copy Details" },
    { action: "share", label: "Share Details" },
  ];

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="border border-white/15 bg-carbon px-3 py-1.5 font-body text-xs text-bone hover:border-white/30 focus-visible:-outline-offset-2"
      >
        Actions
      </button>

      <div
        role="menu"
        className={`absolute right-0 z-40 mt-1 w-44 origin-top-right border border-white/15 bg-carbon py-1 shadow-lg transition-all duration-150 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {items.map(({ action, label, disabled }) => (
          <button
            key={action}
            type="button"
            role="menuitem"
            disabled={disabled}
            title={disabled ? "Not available for your own account" : undefined}
            onClick={() => {
              setOpen(false);
              onAction(action);
            }}
            className={`block w-full px-3 py-2 text-left font-body text-xs hover:bg-white/5 focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:text-ash disabled:opacity-50 disabled:hover:bg-transparent ${
              action === "block" && !disabled ? "text-smash-text" : "text-bone"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
