import Link from "next/link";
import { ADMIN_STATUS_FILTERS } from "@/shared/types/onboarding";

type OnboardingListFiltersProps = {
  currentStatus?: string;
  currentQ?: string;
};

// Plain links + a GET form — a full navigation per click, no client JS
// needed. Keeps this page entirely server-rendered, matching how the rest
// of the admin area is built.
export default function OnboardingListFilters({ currentStatus, currentQ }: OnboardingListFiltersProps) {
  const tabHref = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (currentQ) params.set("q", currentQ);
    const query = params.toString();
    return query ? `/admin/onboarding?${query}` : "/admin/onboarding";
  };

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-2">
        <Link
          href={tabHref(undefined)}
          className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
            !currentStatus ? "border-smash bg-smash-dim text-bone" : "border-carbon bg-carbon text-ash hover:text-bone"
          }`}
        >
          All
        </Link>
        {ADMIN_STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={tabHref(filter.id)}
            className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
              currentStatus === filter.id
                ? "border-smash bg-smash-dim text-bone"
                : "border-carbon bg-carbon text-ash hover:text-bone"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <form method="GET" action="/admin/onboarding" className="flex gap-2">
        {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
        <label htmlFor="admin-search" className="sr-only">
          Search by company, contact, or email
        </label>
        <input
          id="admin-search"
          type="text"
          name="q"
          defaultValue={currentQ}
          placeholder="Search company, contact, or email"
          className="w-full max-w-sm rounded-none border border-carbon bg-carbon px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
        <button
          type="submit"
          className="rounded-none border border-carbon bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-ash focus-visible:-outline-offset-2"
        >
          Search
        </button>
        {currentQ && (
          <Link
            href={tabHref(currentStatus)}
            className="flex items-center font-body text-xs text-ash underline hover:text-bone"
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}
