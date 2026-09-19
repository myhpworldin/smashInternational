"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserRow, AdminUserStatus, CreatedAdminUser } from "@/shared/types/adminUser";
import type { Role } from "@/shared/types/user";
import { ADMIN_USER_ROLE_LABEL, ADMIN_USER_STATUS_LABEL, STAFF_AVAILABILITY_LABEL } from "@/shared/types/adminUser";
import { formatDateTime } from "@/lib/format/date";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import type { UserAction } from "./UserActionsMenu";
import UserDetailDrawer from "./UserDetailDrawer";
import EditUserDialog, { type EditableUserFields } from "./EditUserDialog";
import ChangeRoleDialog from "./ChangeRoleDialog";
import ConfirmActionDialog, { type ActionResult } from "./ConfirmActionDialog";
import CreateUserDialog from "./CreateUserDialog";
import CreationResultDialog from "./CreationResultDialog";
import PasswordResetResultDialog from "./PasswordResetResultDialog";
import StaffAvailabilityDialog, { type AvailabilityConfirmResult } from "./StaffAvailabilityDialog";
import type { StaffAvailability } from "@/shared/types/user";
import Toast from "./Toast";

type RoleFilter = "all" | Role;
type StatusFilter = "all" | AdminUserStatus;

function userDetailsText(user: AdminUserRow): string {
  return [
    `Name: ${user.name}`,
    `Email: ${user.email}`,
    `Phone: ${user.phone ?? "—"}`,
    `Role: ${ADMIN_USER_ROLE_LABEL[user.role]}`,
    `Status: ${ADMIN_USER_STATUS_LABEL[user.status]}`,
    ...(user.availability ? [`Availability: ${STAFF_AVAILABILITY_LABEL[user.availability]}`] : []),
    `Created: ${formatDateTime(user.createdAt)}`,
    `Last login: ${user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}`,
  ].join("\n");
}

async function parseMutationResponse(response: Response): Promise<ActionResult> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    return { ok: false, errors: data?.errors ?? ["Something went wrong. Try again."] };
  }
  return { ok: true };
}

export default function UserManagementView({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [activeUser, setActiveUser] = useState<AdminUserRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedAdminUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserRow | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (query && !user.name.toLowerCase().includes(query) && !user.email.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [users, q, roleFilter, statusFilter]);

  const updateUser = (id: string, updates: Partial<AdminUserRow>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const removeUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleAction = (user: AdminUserRow, action: UserAction) => {
    setActiveUser(user);
    switch (action) {
      case "view":
        setDrawerOpen(true);
        break;
      case "edit":
        setEditOpen(true);
        break;
      case "role":
        setRoleOpen(true);
        break;
      case "block":
      case "unblock":
        setBlockOpen(true);
        break;
      case "password":
        setPasswordOpen(true);
        break;
      case "availability":
        setAvailabilityOpen(true);
        break;
      case "handovers":
        router.push(`/admin/staff/${user.id}/handover`);
        break;
      case "onboarding":
        router.push(`/admin/users/${user.id}/onboarding`);
        break;
      case "delete":
        setDeleteOpen(true);
        break;
      case "copy":
        navigator.clipboard
          .writeText(userDetailsText(user))
          .then(() => setToastMessage(`Copied details for ${user.name}.`))
          .catch(() => setToastMessage("Couldn't copy — check clipboard permissions."));
        break;
      case "share":
        if (navigator.share) {
          navigator
            .share({ title: user.name, text: userDetailsText(user) })
            .catch(() => {
              /* user cancelled the share sheet — no error to surface */
            });
        } else {
          navigator.clipboard
            .writeText(userDetailsText(user))
            .then(() => setToastMessage("Sharing isn't available here — details copied instead."))
            .catch(() => setToastMessage("Couldn't share or copy details."));
        }
        break;
    }
  };

  const handleEditSave = async (updates: EditableUserFields): Promise<ActionResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const response = await fetch(`/api/admin/users/${activeUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const result = await parseMutationResponse(response);
    if (result.ok) {
      updateUser(activeUser.id, updates);
      setEditOpen(false);
      setToastMessage(`Saved changes for ${updates.name}.`);
    }
    return result;
  };

  const handleRoleConfirm = async (role: Role): Promise<ActionResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const response = await fetch(`/api/admin/users/${activeUser.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const result = await parseMutationResponse(response);
    if (result.ok) {
      updateUser(activeUser.id, { role });
      setRoleOpen(false);
      setToastMessage(`${activeUser.name} is now ${ADMIN_USER_ROLE_LABEL[role]}.`);
    }
    return result;
  };

  const handleBlockConfirm = async (): Promise<ActionResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const nextStatus: AdminUserStatus = activeUser.status === "blocked" ? "active" : "blocked";
    const response = await fetch(`/api/admin/users/${activeUser.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await parseMutationResponse(response);
    if (result.ok) {
      updateUser(activeUser.id, { status: nextStatus });
      setBlockOpen(false);
      setToastMessage(`${activeUser.name} is now ${ADMIN_USER_STATUS_LABEL[nextStatus].toLowerCase()}.`);
    }
    return result;
  };

  const handleDeleteConfirm = async (): Promise<ActionResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const response = await fetch(`/api/admin/users/${activeUser.id}`, { method: "DELETE" });
    const result = await parseMutationResponse(response);
    if (result.ok) {
      const deletedName = activeUser.name;
      removeUser(activeUser.id);
      setDeleteOpen(false);
      setToastMessage(`Deleted ${deletedName}.`);
    }
    return result;
  };

  const handleAvailabilityConfirm = async (
    availability: StaffAvailability,
    reason: string,
  ): Promise<AvailabilityConfirmResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const response = await fetch(`/api/admin/users/${activeUser.id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability, reason: reason || undefined }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? ["Something went wrong. Try again."] };
    }
    updateUser(activeUser.id, { availability });
    setAvailabilityOpen(false);
    const affected = (data.affectedAssignmentIds as string[]).length;
    setToastMessage(
      affected > 0
        ? `${activeUser.name} is now ${STAFF_AVAILABILITY_LABEL[availability].toLowerCase()}. ${affected} assignment${affected === 1 ? "" : "s"} marked for handover.`
        : `${activeUser.name} is now ${STAFF_AVAILABILITY_LABEL[availability].toLowerCase()}.`,
    );
    return { ok: true, affectedAssignmentIds: data.affectedAssignmentIds };
  };

  const handlePasswordResetConfirm = async (): Promise<ActionResult> => {
    if (!activeUser) return { ok: false, errors: ["No user selected."] };
    const response = await fetch(`/api/admin/users/${activeUser.id}/reset-password`, { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? ["Something went wrong. Try again."] };
    }
    updateUser(activeUser.id, { mustChangePassword: true });
    setPasswordOpen(false);
    setResetPasswordUser(activeUser);
    setResetPassword(data.temporaryPassword as string);
    return { ok: true };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-xs text-ash">Connected to the live user directory.</p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
        >
          Create User
        </button>
      </div>

      <UserFilters
        q={q}
        onQChange={setQ}
        role={roleFilter}
        onRoleChange={setRoleFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {filtered.length === 0 ? (
        <p className="font-body text-sm text-ash">No users match this search or filter.</p>
      ) : (
        <UserTable users={filtered} currentUserId={currentUserId} onAction={handleAction} />
      )}

      <UserDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} user={activeUser} />

      <EditUserDialog open={editOpen} onClose={() => setEditOpen(false)} user={activeUser} onSave={handleEditSave} />

      <ChangeRoleDialog open={roleOpen} onClose={() => setRoleOpen(false)} user={activeUser} onConfirm={handleRoleConfirm} />

      <ConfirmActionDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={activeUser?.status === "blocked" ? "Unblock user" : "Block user"}
        description={
          activeUser?.status === "blocked"
            ? `${activeUser?.name} will regain access and be able to sign in again.`
            : `${activeUser?.name} will lose access immediately, and any session they're already signed in with will stop working.`
        }
        confirmLabel={activeUser?.status === "blocked" ? "Unblock" : "Block user"}
        destructive={activeUser?.status !== "blocked"}
        onConfirm={handleBlockConfirm}
      />

      <ConfirmActionDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete user"
        description={`${activeUser?.name} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete user"
        destructive
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmActionDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Reset password"
        description={`${activeUser?.name} will be issued a new temporary password and required to change it at next login. Any session they're already signed in with will stop working immediately.`}
        confirmLabel="Reset password"
        destructive
        onConfirm={handlePasswordResetConfirm}
      />

      <StaffAvailabilityDialog
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        user={activeUser}
        onConfirm={handleAvailabilityConfirm}
      />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(user, temporaryPassword) => {
          const newRow: AdminUserRow = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            emailVerified: true,
            mustChangePassword: true,
            createdAt: new Date(user.createdAt),
            lastLoginAt: null,
            // A brand-new client has no onboarding record until the admin
            // (or the client) actually starts one — matches what
            // resolveOnboardingProgress itself derives for a client with
            // nothing yet (Phase 29 §25's "Create Client → Fill Onboarding"
            // shortcut needs this to show up immediately, not just after a
            // refresh).
            onboardingProgress: user.role === "client" ? "not_started" : undefined,
            onboardingId: user.role === "client" ? null : undefined,
          };
          setUsers((prev) => [newRow, ...prev]);
          setCreateOpen(false);
          setCreatedUser(user);
          setCreatedPassword(temporaryPassword);
        }}
      />

      <CreationResultDialog
        open={createdUser !== null}
        onClose={() => {
          setCreatedUser(null);
          setCreatedPassword(null);
        }}
        user={createdUser}
        temporaryPassword={createdPassword}
      />

      <PasswordResetResultDialog
        open={resetPasswordUser !== null}
        onClose={() => {
          setResetPasswordUser(null);
          setResetPassword(null);
        }}
        user={resetPasswordUser}
        temporaryPassword={resetPassword}
      />

      <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
    </div>
  );
}
