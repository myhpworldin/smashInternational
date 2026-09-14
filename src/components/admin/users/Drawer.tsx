"use client";

import { useEffect, useState } from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

// Right-side slide-over, used for the user detail view so admins can check
// a record without losing their place in the list (list stays visible/scrollable
// behind it on desktop, full-width on mobile).
export default function Drawer({ open, onClose, title, children }: DrawerProps) {
  const [wasOpen, setWasOpen] = useState(open);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  // Adjust mount/visible state synchronously during render in response to
  // the `open` prop changing, rather than in an effect — this is React's
  // recommended pattern for "reset state when a prop changes".
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
    <div className="fixed inset-0 z-50 flex justify-end">
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
        aria-label={title}
        className={`relative flex h-dvh w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-white/15 bg-carbon p-6 transition-transform duration-200 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg text-bone">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
