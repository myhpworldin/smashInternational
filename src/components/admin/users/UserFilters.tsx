"use client";

import type { AdminUserStatus } from "@/shared/types/adminUser";
import type { Role } from "@/shared/types/user";

type RoleFilter = "all" | Role;
type StatusFilter = "all" | AdminUserStatus;

const ROLE_TABS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "admin", label: "Admin" },
  { id: "client", label: "Client" },
];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "blocked", label: "Blocked" },
];

export default function UserFilters({
  q,
  onQChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
}: {
  q: string;
  onQChange: (q: string) => void;
  role: RoleFilter;
  onRoleChange: (role: RoleFilter) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <nav className="flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onRoleChange(tab.id)}
              className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
                role === tab.id
                  ? "border-smash bg-smash-dim text-bone"
                  : "border-white/15 bg-carbon text-bone hover:border-white/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
                status === tab.id
                  ? "border-smash bg-smash-dim text-bone"
                  : "border-white/15 bg-carbon text-bone hover:border-white/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search by name or email
        </label>
        <input
          id="user-search"
          type="text"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search name or email"
          className="w-full max-w-sm rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
        {q && (
          <button
            type="button"
            onClick={() => onQChange("")}
            className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
