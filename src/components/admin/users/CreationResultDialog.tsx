"use client";

import type { CreatedAdminUser } from "@/shared/types/adminUser";
import { ADMIN_USER_ROLE_LABEL, ADMIN_USER_STATUS_LABEL } from "@/shared/types/adminUser";
import { formatDateTime } from "@/lib/format/date";
import { formatUserDetailsText, formatCredentialsText } from "@/lib/format/shareText";
import Modal from "./Modal";
import CredentialActions from "./CredentialActions";

// Shown exactly once, right after a successful admin-created signup — the
// temporary password lives only in this response and in the copy/share
// buffer the admin chooses to use; it is never persisted or retrievable
// again (see createUserByAdmin in adminUsers.service.ts). Closing this
// dialog is the last moment the password is available anywhere in the UI.
export default function CreationResultDialog({
  open,
  onClose,
  user,
  temporaryPassword,
}: {
  open: boolean;
  onClose: () => void;
  user: CreatedAdminUser | null;
  temporaryPassword: string | null;
}) {
  if (!user || !temporaryPassword) return null;

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

  return (
    <Modal open={open} onClose={onClose} title="User created">
      <div className="flex flex-col gap-4">
        <p className="font-body text-sm text-ash">
          Account creation status: <span className="text-bone">Active — created</span>
        </p>

        <dl className="flex flex-col gap-2 font-body text-sm">
          <div className="flex justify-between gap-4 border-b border-carbon pb-2">
            <dt className="text-ash">Name</dt>
            <dd className="text-bone">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-carbon pb-2">
            <dt className="text-ash">Email</dt>
            <dd className="text-bone">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-carbon pb-2">
            <dt className="text-ash">Role</dt>
            <dd className="text-bone">{ADMIN_USER_ROLE_LABEL[user.role]}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-carbon pb-2">
            <dt className="text-ash">Status</dt>
            <dd className="text-bone">{ADMIN_USER_STATUS_LABEL[user.status]}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-carbon pb-2">
            <dt className="text-ash">Created</dt>
            <dd className="text-bone">{formatDateTime(user.createdAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-1 border border-smash bg-smash-dim px-3 py-3">
          <span className="font-body text-xs text-bone uppercase">Temporary password</span>
          <span className="break-all font-display text-lg text-bone">{temporaryPassword}</span>
        </div>

        <p className="font-body text-xs text-ash">
          This temporary password will be required for the user&apos;s first login. It won&apos;t be shown again —
          copy or share it now.
        </p>

        <CredentialActions
          detailsText={formatUserDetailsText(user)}
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
