import type { AdminUserRow } from "@/shared/types/adminUser";
import { ADMIN_USER_ROLE_LABEL, ADMIN_USER_STATUS_LABEL, STAFF_AVAILABILITY_LABEL } from "@/shared/types/adminUser";

export function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  return (
    <span className="border border-carbon bg-carbon px-2 py-1 font-body text-xs text-bone uppercase">
      {ADMIN_USER_ROLE_LABEL[role]}
    </span>
  );
}

export function StatusBadge({ status }: { status: AdminUserRow["status"] }) {
  const blocked = status === "blocked";
  return (
    <span
      className={`border px-2 py-1 font-body text-xs uppercase ${
        blocked ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-carbon text-bone"
      }`}
    >
      {ADMIN_USER_STATUS_LABEL[status]}
    </span>
  );
}

export function AvailabilityBadge({ availability }: { availability: NonNullable<AdminUserRow["availability"]> }) {
  const blocking = availability !== "available";
  return (
    <span
      className={`border px-2 py-1 font-body text-xs uppercase ${
        blocking ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-carbon text-bone"
      }`}
    >
      {STAFF_AVAILABILITY_LABEL[availability]}
    </span>
  );
}

export function VerificationBadge({ user }: { user: AdminUserRow }) {
  // Admin accounts predate the emailVerified field (Phase 1 audit) — treat
  // as not applicable rather than implying they're unverified.
  if (user.role === "admin") {
    return <span className="font-body text-xs text-ash">—</span>;
  }
  return (
    <span className={`font-body text-xs ${user.emailVerified ? "text-ash" : "text-smash-text"}`}>
      {user.emailVerified ? "Verified" : "Unverified"}
    </span>
  );
}
