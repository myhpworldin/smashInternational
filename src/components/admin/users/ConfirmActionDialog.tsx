"use client";

import { useState } from "react";
import Modal from "./Modal";

export type ActionResult = { ok: true } | { ok: false; errors: string[] };

export default function ConfirmActionDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<ActionResult>;
  children?: React.ReactNode;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear any error left over from a previous open the moment this dialog
  // opens again — adjusted during render (React's recommended pattern),
  // not in an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onConfirm();
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="font-body text-sm text-ash">{description}</p>
      {children}
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          aria-busy={submitting}
          className={`rounded-none px-[18px] py-[14px] font-body text-sm disabled:opacity-60 focus-visible:-outline-offset-2 ${
            destructive ? "border border-smash bg-smash-dim text-bone" : "bg-white text-void"
          }`}
        >
          {submitting ? "Working" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
