import Link from "next/link";
import { AUDIT_ACTION_FILTERS } from "@/shared/types/auditLog";

type AuditLogFiltersProps = {
  currentAction?: string;
  currentRole?: string;
  currentQ?: string;
  currentFrom?: string;
  currentTo?: string;
};

const ROLE_TABS: { id?: string; label: string }[] = [
  { id: undefined, label: "All roles" },
  { id: "admin", label: "Admin" },
  { id: "client", label: "Client" },
];

// Same plain-links-plus-GET-form pattern as OnboardingListFilters — a
// full navigation per change, entirely server-rendered, no client JS
// needed (Phase 7 spec §11 asks this to match existing conventions).
export default function AuditLogFilters({
  currentAction,
  currentRole,
  currentQ,
  currentFrom,
  currentTo,
}: AuditLogFiltersProps) {
  const roleHref = (role?: string) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (currentAction) params.set("action", currentAction);
    if (currentQ) params.set("q", currentQ);
    if (currentFrom) params.set("from", currentFrom);
    if (currentTo) params.set("to", currentTo);
    const query = params.toString();
    return query ? `/admin/users/audit-log?${query}` : "/admin/users/audit-log";
  };

  const hasFilters = Boolean(currentQ || currentAction || currentFrom || currentTo);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-2">
        {ROLE_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={roleHref(tab.id)}
            className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
              currentRole === tab.id
                ? "border-smash bg-smash-dim text-bone"
                : "border-white/15 bg-carbon text-bone hover:border-white/30"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <form method="GET" action="/admin/users/audit-log" className="flex flex-wrap items-end gap-2">
        {currentRole && <input type="hidden" name="role" value={currentRole} />}

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-search" className="font-body text-[10px] text-ash uppercase">
            Search
          </label>
          <input
            id="audit-search"
            type="text"
            name="q"
            defaultValue={currentQ}
            placeholder="Actor, target, or email"
            className="w-full min-w-[14rem] rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-action" className="font-body text-[10px] text-ash uppercase">
            Action
          </label>
          <select
            id="audit-action"
            name="action"
            defaultValue={currentAction ?? ""}
            className="rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          >
            <option value="">All actions</option>
            {AUDIT_ACTION_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-from" className="font-body text-[10px] text-ash uppercase">
            From
          </label>
          <input
            id="audit-from"
            type="date"
            name="from"
            defaultValue={currentFrom}
            className="rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="audit-to" className="font-body text-[10px] text-ash uppercase">
            To
          </label>
          <input
            id="audit-to"
            type="date"
            name="to"
            defaultValue={currentTo}
            className="rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </div>

        <button
          type="submit"
          className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          Filter
        </button>
        {hasFilters && (
          <Link
            href={roleHref(currentRole)}
            className="flex items-center font-body text-xs text-ash underline hover:text-bone"
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}
