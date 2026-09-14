"use client";

import { useEffect, useState } from "react";

// Ephemeral success banner for local (not-yet-persisted) state changes —
// block/unblock, role change, etc. Auto-dismisses; also closable by hand.
export default function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => setVisible(false), 3200);
    const clear = setTimeout(onDone, 3500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 border border-white/15 bg-carbon px-4 py-3 font-body text-sm text-bone shadow-lg transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
