"use client";

import { useState } from "react";
import type { AdminUserRow } from "@/shared/types/adminUser";
import { ADMIN_USER_ROLE_LABEL } from "@/shared/types/adminUser";
import type { Role } from "@/shared/types/user";
import type { ActionResult } from "./ConfirmActionDialog";
import Modal from "./Modal";

export default function ChangeRoleDialog({
  open,
  onClose,
  user,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUserRow | null;
  onConfirm: (role: Role) => Promise<ActionResult>;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [role, setRole] = useState<Role>(user?.role ?? "client");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the target user's current role each time the dialog opens —
  // adjusted during render rather than in an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && user) {
      setRole(user.role);
      setError(null);
    }
  }

  if (!user) return null;

  const handleConfirm = async () => {
    if (submitting || role === user.role) return;
    setSubmitting(true);
    setError(null);
    const result = await onConfirm(role);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change role">
      <p className="font-body text-sm text-ash">
        Only Admin and Client roles exist in this system.
      </p>

      <p className="font-body text-sm text-bone">
        Current role: <span className="text-ash">{ADMIN_USER_ROLE_LABEL[user.role]}</span>
        {role !== user.role && (
          <>
            {" "}
            → New role: <span className="text-bone">{ADMIN_USER_ROLE_LABEL[role]}</span>
          </>
        )}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">New role for {user.name}</legend>
        {(["admin", "client"] as Role[]).map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 border px-3 py-2 font-body text-sm transition-colors duration-150 ${
              role === option ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-carbon text-bone"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
              className="accent-smash"
            />
            {ADMIN_USER_ROLE_LABEL[option]}
          </label>
        ))}
      </fieldset>

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
          disabled={submitting || role === user.role}
          aria-busy={submitting}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save role"}
        </button>
      </div>
    </Modal>
  );
}
