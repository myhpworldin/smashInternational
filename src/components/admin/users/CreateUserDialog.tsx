"use client";

import { useState } from "react";
import type { Role } from "@/shared/types/user";
import type { AdminUserStatus, CreatedAdminUser } from "@/shared/types/adminUser";
import Modal from "./Modal";

export default function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: CreatedAdminUser, temporaryPassword: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("client");
  const [status, setStatus] = useState<AdminUserStatus>("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("client");
    setStatus("active");
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const valid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  const handleCreate = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role,
          status,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? "Couldn't create this user. Try again.");
        return;
      }

      onCreated(data.user as CreatedAdminUser, data.temporaryPassword as string);
      reset();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create user">
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="font-body text-xs text-smash-text">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="create-name" className="font-body text-xs text-ash uppercase">
            Name
          </label>
          <input
            id="create-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="create-email" className="font-body text-xs text-ash uppercase">
            Email
          </label>
          <input
            id="create-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="create-phone" className="font-body text-xs text-ash uppercase">
            Phone
          </label>
          <input
            id="create-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-body text-xs text-ash uppercase">Role</span>
          <div className="flex gap-2">
            {(["admin", "client"] as Role[]).map((option) => (
              <label
                key={option}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border px-3 py-2 font-body text-sm transition-colors duration-150 ${
                  role === option ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-void text-bone"
                }`}
              >
                <input
                  type="radio"
                  name="create-role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="accent-smash"
                />
                {option === "admin" ? "Admin" : "Client"}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-body text-xs text-ash uppercase">Account status</span>
          <div className="flex gap-2">
            {(["active", "blocked"] as AdminUserStatus[]).map((option) => (
              <label
                key={option}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border px-3 py-2 font-body text-sm transition-colors duration-150 ${
                  status === option ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-void text-bone"
                }`}
              >
                <input
                  type="radio"
                  name="create-status"
                  value={option}
                  checked={status === option}
                  onChange={() => setStatus(option)}
                  className="accent-smash"
                />
                {option === "active" ? "Active" : "Blocked"}
              </label>
            ))}
          </div>
        </div>

        <div className="border border-white/15 bg-void px-3 py-2 font-body text-xs text-ash">
          A secure temporary password will be generated automatically — you won&apos;t need to set one. No OTP step
          is sent for admin-created accounts; the user changes this password at their first login instead.
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || !valid}
          aria-busy={submitting}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Creating" : "Create user"}
        </button>
      </div>
    </Modal>
  );
}
