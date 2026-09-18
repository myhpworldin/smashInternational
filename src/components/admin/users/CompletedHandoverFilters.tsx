import Link from "next/link";
import { SERVICES } from "@/shared/config/services";

type CompletedHandoverFiltersProps = {
  currentQ?: string;
  currentServiceId?: string;
  currentFrom?: string;
  currentTo?: string;
};

// Same plain-links-plus-GET-form pattern as AuditLogFilters — entirely
// server-rendered, no client JS, matching the existing admin conventions
// (Phase 5 §2/§15).
export default function CompletedHandoverFilters({
  currentQ,
  currentServiceId,
  currentFrom,
  currentTo,
}: CompletedHandoverFiltersProps) {
  const hasFilters = Boolean(currentQ || currentServiceId || currentFrom || currentTo);

  return (
    <form method="GET" action="/admin/users/handovers" className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="handover-search" className="font-body text-[10px] text-ash uppercase">
          Search
        </label>
        <input
          id="handover-search"
          type="text"
          name="q"
          defaultValue={currentQ}
          placeholder="Staff, email, or company"
          className="w-full min-w-[14rem] rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="handover-service" className="font-body text-[10px] text-ash uppercase">
          Service
        </label>
        <select
          id="handover-service"
          name="service"
          defaultValue={currentServiceId ?? ""}
          className="rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          <option value="">All services</option>
          {SERVICES.map((service) => (
            <option key={service.id} value={service.id}>
              {service.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="handover-from" className="font-body text-[10px] text-ash uppercase">
          From
        </label>
        <input
          id="handover-from"
          type="date"
          name="from"
          defaultValue={currentFrom}
          className="rounded-none border border-white/15 bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="handover-to" className="font-body text-[10px] text-ash uppercase">
          To
        </label>
        <input
          id="handover-to"
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
          href="/admin/users/handovers"
          className="flex items-center font-body text-xs text-ash underline hover:text-bone"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
