"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/client/ClientSidebar";

// Left-side slide-over for the client nav on tablet/mobile — same
// mount/visible state machine and Escape-to-close behavior as
// admin/users/Drawer.tsx (that one slides from the right for a detail
// view; this one from the left, since it's replacing a sidebar, not
// opening a secondary panel).
export default function MobileNavDrawer({
  open,
  onClose,
  notificationCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  notificationCount?: number;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRendered(true);
    } else {
      setVisible(false);
    }
  }

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const timeout = setTimeout(() => setRendered(false), 200);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div
        className={`absolute inset-0 bg-void/80 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`relative flex h-dvh w-full max-w-xs flex-col gap-4 overflow-y-auto border-r border-white/15 bg-carbon p-6 transition-transform duration-200 ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-xs tracking-[0.14em] text-bone uppercase">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
          >
            Close
          </button>
        </div>
        <ClientSidebar onNavigate={onClose} notificationCount={notificationCount} />
      </div>
    </div>
  );
}
