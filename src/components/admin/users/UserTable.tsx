import type { AdminUserRow } from "@/shared/types/adminUser";
import { formatDateTime } from "@/lib/format/date";
import { RoleBadge, StatusBadge, VerificationBadge, AvailabilityBadge } from "./Badges";
import UserActionsMenu, { type UserAction } from "./UserActionsMenu";

export default function UserTable({
  users,
  currentUserId,
  onAction,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  onAction: (user: AdminUserRow, action: UserAction) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Verified</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Last login</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-carbon/60 text-bone">
                <td className="py-3 pr-4">
                  {user.name}
                  {user.mustChangePassword && (
                    <span className="ml-2 border border-white/15 px-1.5 py-0.5 font-body text-[10px] text-ash uppercase">
                      Temp password
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-ash">{user.email}</td>
                <td className="py-3 pr-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={user.status} />
                    {user.availability && <AvailabilityBadge availability={user.availability} />}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <VerificationBadge user={user} />
                </td>
                <td className="py-3 pr-4 text-ash">{formatDateTime(user.createdAt)}</td>
                <td className="py-3 pr-4 text-ash">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</td>
                <td className="py-3">
                  <UserActionsMenu user={user} isSelf={user.id === currentUserId} onAction={(action) => onAction(user, action)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-body text-sm text-bone">{user.name}</span>
                <span className="font-body text-xs text-ash">{user.email}</span>
              </div>
              <UserActionsMenu user={user} isSelf={user.id === currentUserId} onAction={(action) => onAction(user, action)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
              {user.availability && <AvailabilityBadge availability={user.availability} />}
              <VerificationBadge user={user} />
              {user.mustChangePassword && (
                <span className="border border-white/15 px-1.5 py-0.5 font-body text-[10px] text-ash uppercase">
                  Temp password
                </span>
              )}
            </div>
            <div className="flex items-center justify-between font-body text-xs text-ash">
              <span>Created {formatDateTime(user.createdAt)}</span>
              <span>{user.lastLoginAt ? `Last login ${formatDateTime(user.lastLoginAt)}` : "Never logged in"}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
