"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  | "handovers"
  | "delete";

const MENU_WIDTH_PX = 176; // w-44
const VIEWPORT_MARGIN_PX = 8;

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
  // `ready` gates visibility: the menu mounts once (invisible) at a first
  // guess below the button so its real height can be measured, then the
  // layout effect below corrects top/maxHeight against the viewport before
  // revealing it — avoiding a visible jump on every open.
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const [ready, setReady] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The table this menu lives in scrolls horizontally (overflow-x-auto in
  // UserTable.tsx), and any `overflow` other than visible clips an
  // absolutely-positioned descendant on both axes — that clipped every row
  // but the last few, hiding "Share Details"/"Delete User" behind the
  // table's own edge with no way to scroll to them. Portaling the menu to
  // document.body and positioning it with `fixed` (computed from the
  // trigger button's own rect) escapes that ancestor entirely; it's no
  // longer a descendant of anything that clips.
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(VIEWPORT_MARGIN_PX, rect.right - MENU_WIDTH_PX),
      });
    }
    setReady(false);
    setOpen(true);
  };

  // Escaping the table's clipping container (above) only fixed the
  // horizontal case — a button near the bottom of the viewport still had
  // its menu run off the bottom of the *screen* with no way to reach the
  // last items, since a first-guess position below the button never
  // accounted for how tall the menu actually is or how much room is left
  // below it. This measures the real rendered height once mounted and
  // either flips the menu above the button or caps its height with a
  // scrollbar, whichever leaves more usable room.
  useLayoutEffect(() => {
    if (!open || !position || ready) return;
    const menuEl = menuRef.current;
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (!menuEl || !buttonRect) return;

    const menuHeight = menuEl.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - buttonRect.bottom - VIEWPORT_MARGIN_PX;
    const spaceAbove = buttonRect.top - VIEWPORT_MARGIN_PX;

    if (menuHeight > spaceBelow) {
      if (spaceAbove >= menuHeight) {
        // Fits above in full — flip up, no scrolling needed.
        setPosition((prev) => (prev ? { ...prev, top: buttonRect.top - 4 - menuHeight } : prev));
      } else if (spaceAbove > spaceBelow) {
        // Doesn't fully fit either way — flip up into whichever side has
        // more room, and let the menu itself scroll for the rest.
        setPosition((prev) => (prev ? { ...prev, top: VIEWPORT_MARGIN_PX, maxHeight: spaceAbove } : prev));
      } else {
        setPosition((prev) => (prev ? { ...prev, maxHeight: spaceBelow } : prev));
      }
    }
    setReady(true);
  }, [open, position, ready]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // A portaled menu is positioned from a snapshot of the button's rect
    // taken at open time — it won't track a scroll or resize that moves
    // that rect out from under it, so both close the menu instead of
    // leaving it floating over the wrong spot. `capture: true` on scroll
    // catches scrolling on the table's own container, not just the window.
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, { capture: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
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
    {
      action: "delete",
      label: "Delete User",
      disabled: isSelf,
    },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="menu"
        aria-expanded={open}
        className="border border-white/15 bg-carbon px-3 py-1.5 font-body text-xs text-bone hover:border-white/30 focus-visible:-outline-offset-2"
      >
        Actions
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              top: position.top,
              left: position.left,
              width: MENU_WIDTH_PX,
              ...(position.maxHeight !== undefined && { maxHeight: position.maxHeight, overflowY: "auto" }),
              visibility: ready ? "visible" : "hidden",
            }}
            className="fixed z-40 origin-top-right border border-white/15 bg-carbon py-1 shadow-lg"
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
                  (action === "block" || action === "delete") && !disabled ? "text-smash-text" : "text-bone"
                }`}
              >
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
