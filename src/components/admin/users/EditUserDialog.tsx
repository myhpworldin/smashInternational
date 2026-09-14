"use client";

import { useState } from "react";
import type { AdminUserRow } from "@/shared/types/adminUser";
import type { ActionResult } from "./ConfirmActionDialog";
import Modal from "./Modal";

export type EditableUserFields = { name: string; phone: string | null; email: string };

export default function EditUserDialog({
  open,
  onClose,
  user,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUserRow | null;
  onSave: (updates: EditableUserFields) => Promise<ActionResult>;
}) {
  const [prevUser, setPrevUser] = useState(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form fields during render when the target user changes,
  // rather than in an effect (React's recommended pattern for this).
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
    setError(null);
  }

  if (!user) return null;

  const valid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  const handleSave = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setError(null);
    const result = await onSave({ name: name.trim(), phone: phone.trim() || null, email: email.trim() });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit user">
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="font-body text-xs text-smash-text">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-name" className="font-body text-xs text-ash uppercase">
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-email" className="font-body text-xs text-ash uppercase">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-phone" className="font-body text-xs text-ash uppercase">
            Phone
          </label>
          <input
            id="edit-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
        </div>

        <p className="font-body text-xs text-ash">
          Role, account status, and password are changed from their own actions, not here.
        </p>
      </div>

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
          onClick={handleSave}
          disabled={submitting || !valid}
          aria-busy={submitting}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
