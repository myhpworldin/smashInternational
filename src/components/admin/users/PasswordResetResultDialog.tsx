"use client";

import type { AdminUserRow } from "@/shared/types/adminUser";
import { formatCredentialsText } from "@/lib/format/shareText";
import Modal from "./Modal";
import CredentialActions from "./CredentialActions";

// Same one-time-reveal shape as CreationResultDialog (Phase 3) — the new
// temporary password only ever exists in this response and whatever the
// admin copies/shares from here; it's never persisted or retrievable
// again (see resetUserPassword in adminUsers.service.ts). Only
// Copy/Share Credentials here, not a details copy too — the admin
// already has this user's details from the list (Phase 6 spec §6).
export default function PasswordResetResultDialog({
  open,
  onClose,
  user,
  temporaryPassword,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUserRow | null;
  temporaryPassword: string | null;
}) {
  if (!user || !temporaryPassword) return null;

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

  return (
    <Modal open={open} onClose={onClose} title="Password reset">
      <div className="flex flex-col gap-4">
        <p className="font-body text-sm text-ash">
          Any session <span className="text-bone">{user.name}</span> was already signed in with has been
          invalidated. They&apos;ll need this password to sign in again, and will be required to change it
          immediately after.
        </p>

        <div className="flex flex-col gap-1 border border-smash bg-smash-dim px-3 py-3">
          <span className="font-body text-xs text-bone uppercase">New temporary password</span>
          <span className="break-all font-display text-lg text-bone">{temporaryPassword}</span>
        </div>

        <p className="font-body text-xs text-ash">It won&apos;t be shown again — copy or share it now.</p>

        <CredentialActions
          credentialsText={formatCredentialsText({
            name: user.name,
            email: user.email,
            role: user.role,
            temporaryPassword,
            loginUrl,
          })}
          shareTitle="SMASH CRM Account"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
