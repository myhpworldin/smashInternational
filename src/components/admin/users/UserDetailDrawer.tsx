import type { AdminUserRow } from "@/shared/types/adminUser";
import { formatDateTime } from "@/lib/format/date";
import Drawer from "./Drawer";
import { RoleBadge, StatusBadge, VerificationBadge } from "./Badges";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-carbon pb-3">
      <span className="font-body text-xs text-ash uppercase">{label}</span>
      <span className="font-body text-sm text-bone">{value}</span>
    </div>
  );
}

export default function UserDetailDrawer({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUserRow | null;
}) {
  if (!user) return null;

  return (
    <Drawer open={open} onClose={onClose} title="User details">
      <div className="flex flex-col gap-4">
        <Field label="Name" value={user.name} />
        <Field label="Email" value={user.email} />
        <Field label="Phone" value={user.phone ?? "—"} />
        <Field label="Role" value={<RoleBadge role={user.role} />} />
        <Field label="Account status" value={<StatusBadge status={user.status} />} />
        <Field label="Verification" value={<VerificationBadge user={user} />} />
        <Field label="Created" value={formatDateTime(user.createdAt)} />
        <Field label="Last login" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"} />
        <Field
          label="Password"
          value={
            user.mustChangePassword
              ? "Temporary password set — must be changed at next login"
              : "Set — not visible to admins"
          }
        />
      </div>
    </Drawer>
  );
}
