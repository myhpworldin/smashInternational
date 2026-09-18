"use client";

// Stage 1 Phase 9 §22/§23 — generic filter controls shared by Projects and
// Campaigns. Purely presentational: it owns no state and knows nothing
// about what it's filtering — the list page passes the current value and
// gets a new one back on change, then does its own (client-side, §22:
// "do not implement complex server-side filtering in this phase") array
// filtering with it.
export type FilterOption = { value: string; label: string };

export type FilterBarValue = { status: string; service: string; search: string };

export default function FilterBar({
  statusOptions,
  serviceOptions,
  value,
  onChange,
  searchPlaceholder,
}: {
  statusOptions: FilterOption[];
  serviceOptions: FilterOption[];
  value: FilterBarValue;
  onChange: (next: FilterBarValue) => void;
  searchPlaceholder: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="filter-search">
        {searchPlaceholder}
      </label>
      <input
        id="filter-search"
        type="text"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder={searchPlaceholder}
        className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone placeholder-ash focus-visible:-outline-offset-2"
      />
      <select
        aria-label="Filter by status"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
        className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
      >
        <option value="">All statuses</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {serviceOptions.length > 0 && (
        <select
          aria-label="Filter by service"
          value={value.service}
          onChange={(e) => onChange({ ...value, service: e.target.value })}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
        >
          <option value="">All services</option>
          {serviceOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
